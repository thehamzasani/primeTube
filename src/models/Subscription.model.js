import mongoose,{Schema} from "mongoose";
import { User } from "./user.model";

const subscriptionSchema = new Schema({
    subscriber : {
        type: Schema.types.objectId,
        ref : "User"
    },
    channel : {
        type : Schema.Types.objectId,
        ref : "User"
    }
},
{
    timestamps : true
})

export const Subscription = mongoose.model("Subscription", subscriptionSchema)
