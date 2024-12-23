const HeaderBox = ({type = "title", title, subtext, user}: HeaderBoxProps) => {
    return (
        <div className="header-box">
            <h1 className="header-box-title">
                {title}
                {type === "greeting" && (
                    <span className="text-bankGradient">
                        &nbsp;{user}<span className="header-box-title">!</span>
                    </span>
                )}
            </h1>
            <p className="header-box-subtext">{subtext}</p>
        </div>
    )
}
export default HeaderBox