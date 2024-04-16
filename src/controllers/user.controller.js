import { asyncHandler } from "../utils/ayncHandler.js"



const registerUser = asyncHandler( async (req, res) => {
    const {fullName, email, username, password} = req.body
    console.log(("email", email));
} )


export { registerUser }