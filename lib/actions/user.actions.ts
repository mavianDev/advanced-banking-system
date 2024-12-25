'use server'

import {
    createBankAccountProps,
    exchangePublicTokenProps,
    getUserInfoProps,
    signInProps,
    SignUpParams,
    User
} from "@/types";
import {createAdminClient, createSessionClient} from "@/lib/appwrite";
import {ID, Query} from "node-appwrite";
import {cookies} from "next/headers";
import {encryptId, extractCustomerIdFromUrl, parseStringify} from "@/lib/utils";
import {CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products} from "plaid";
import {plaidClient} from "@/lib/plaid";
import {revalidatePath} from "next/cache";
import {addFundingSource, createDwollaCustomer} from "@/lib/actions/dwolla.actions";

const {APPWRITE_DATABASE_ID: DATABASE_ID, APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID, APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID} = process.env;

export const signIn = async ({ email, password }: signInProps) => {
    try {
        const { account } = await createAdminClient();
        const session = await account.createEmailPasswordSession(email, password);

        (await cookies()).set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });

        const user = await getUserInfo({ userId: session.userId });

        return parseStringify(user);
    } catch (error) {
        console.error("Error", error);
        return null;
    }
};


export const signUp = async ({ password, ...userData }: SignUpParams) => {
    let newUserAccount;

    try {
        // create appwrite user
        const { database, account } = await createAdminClient();
        newUserAccount = await account.create(
            ID.unique(),
            userData.email,
            password,
            `${userData.firstName} ${userData.lastName}`
        );

        if (!newUserAccount) throw new Error("Error creating user");

        // create dwolla customer
        const dwollaCustomerUrl = await createDwollaCustomer({
            ...userData,
            type: "personal",
        });

        if (!dwollaCustomerUrl) throw new Error("Error creating dwolla customer");
        const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

        const newUser = await database.createDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            ID.unique(),
            {
                ...userData,
                userId: newUserAccount.$id,
                dwollaCustomerUrl,
                dwollaCustomerId,
            }
        );

        const session = await account.createEmailPasswordSession(
            userData.email,
            password
        );

        (await cookies()).set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });

        return parseStringify(newUser);
    } catch (error) {
        console.error("Error", error);

        // check if account has been created, if so, delete it
        if (newUserAccount?.$id) {
            const { user } = await createAdminClient();
            await user.delete(newUserAccount?.$id);
        }

        return null;
    }
};

export async function getLoggedInUser() {
    try {
        const { account } = await createSessionClient();
        const user = await account.get();
        return parseStringify(user);
    } catch (error) {
        return null;
    }
}

export const logoutAccount = async () => {
    try {
        const {account} = await createSessionClient();

        (await cookies()).delete("appwrite-session");

        await account.deleteSession("current");
    } catch (error) {
        return null;
    }
}

export const createLinkToken = async (user: User) => {
    try {
        const tokenParams = {
            user: {
                client_user_id: user.$id,
            },
            client_name: user.firstName + user.lastName,
            products: ["auth"] as Products[],
            language: "en",
            country_codes: ["US"] as CountryCode[],
        };

        const response = await plaidClient.linkTokenCreate(tokenParams);

        return parseStringify({ linkToken: response.data.link_token });
    } catch (error) {
        console.error(
            "An error occurred while creating a new Horizon user:",
            error
        );
    }
};

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
    try {
        const { database } = await createAdminClient();

        const user = await database.listDocuments(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            [Query.equal("userId", [userId])]
        );

        if (user.total !== 1) return null;

        return parseStringify(user.documents[0]);
    } catch (error) {
        console.error("Error", error);
        return null;
    }
};

export const createBankAccount = async ({
    userId,
    bankId,
    accountId,
    accessToken,
    fundingSourceUrl,
    sharableId,
}: createBankAccountProps) => {
    try {
        const {database} = await createAdminClient();

        const bankAccount = await database.createDocument(DATABASE_ID!, BANK_COLLECTION_ID!, ID.unique(), {
            userId,
            bankId,
            accountId,
            accessToken,
            fundingSourceUrl,
            sharableId,
        });

        return parseStringify(bankAccount);
    } catch (error) {
        console.log (error);
    }
}

export const exchangePublicToken = async ({
    publicToken,
    user,
}: exchangePublicTokenProps) => {
    try {
        const response = await plaidClient.itemPublicTokenExchange({public_token: publicToken});

        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        const accountsResponse = await plaidClient.accountsGet({access_token: accessToken});

        const accountData = accountsResponse.data.accounts[0];

        const request: ProcessorTokenCreateRequest = {
            access_token: accessToken,
            account_id: accountData.account_id,
            processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
        };

        const processorTokenResponse = await plaidClient.processorTokenCreate(request);
        const processorToken = processorTokenResponse.data.processor_token;

        const fundingSourceUrl = await addFundingSource({
            dwollaCustomerId: user.dwollaCustomerId,
            processorToken,
            bankName: accountData.name,
        });

        if (!fundingSourceUrl) {
            throw Error;
        }

        await createBankAccount ({
            userId: user.$id,
            bankId: itemId,
            accountId: accountData.account_id,
            accessToken,
            fundingSourceUrl,
            sharableId: encryptId(accountData.account_id)
        });

        revalidatePath("/");

        return parseStringify({
            publicTokenExchange: "Public Token Exchange complete!",
        });
    } catch (error) {
        console.log("An error occured while creating exchanging token:", error);
    }
}

