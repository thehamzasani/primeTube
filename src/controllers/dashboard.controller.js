import mongoose, { mongo } from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId = req.user._id;

    const statsData = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group : {
                _id : null,
                totalViews : {$sum : "$views"},
                totalLikes : {$sum : "$likes"},
                totalVideos : {$sum : 1}
            }
        },
        {
            $project : {
                totalLikes : 1,
                totalVideos : 1,
                totalViews : 1
            }
        }
    ])

    const channel = await User.aggregate([
        {
            $match: {
                _id : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (!channel && !statsData) {
        throw new ApiError(400 , "Sorry the user data is not found.");
        
    }

    const finalData = {
        ...(statsData[0]),
        ...(channel[0])
    }

    return res.status(200).json(
        new ApiResponse(200, finalData, "Successfully retrived all data.")
    )

})



const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const {channelId} = req.params; // channelId is userId because each user also represents a channel

    if (!channelId) {
        throw new ApiError(400 , "User id not found");
    }

    const videos = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $sort : {
                createdAt : -1
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "All videos retrieved successfully"
        )
    )




})

export {
    getChannelStats, 
    getChannelVideos
    }