import React from 'react'
import {FormControl, FormField, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {CustomInputProps} from "@/types";
import {authFormSchema} from "@/lib/utils";

const formSchema = authFormSchema("sign-up");

const CustomInput = ({control, name, label, placeholder}: CustomInputProps) => {

    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <div className="form-item">
                    <FormLabel className="form-label">
                        {label}
                    </FormLabel>
                    <div className="flex w-full flex-col">
                        <FormControl>
                            <Input
                                placeholder={placeholder}
                                className="input-class"
                                type={name === "password" ? "password" : "text"}
                                {...field}
                            />
                        </FormControl>
                        <FormMessage className="form-message mt-3" />
                    </div>
                </div>
            )}
        />
    )
}
export default CustomInput