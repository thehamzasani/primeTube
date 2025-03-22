import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js" 
import { json } from "express"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    page = parseInt(page);
    const videoComments = await Comment.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "ownerDetails"
            }
        },
        {
            $unwind : "ownerDetails"
        },
        {
            $sort : {createdAt : -1}
        },
        {
            $skip: (page - 1) * parseInt(limit) // Pagination
        },
        {
            $limit: parseInt(limit)
        },
        {
            $project : {
                content : 1,
                createdAt :1,
                "ownerDetails.username" : 1, 
                "ownerDetails.avatar": 1,
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, videoComments, "Successfully retrieved comments")
    )

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params;
    const {content} = req.body;
    const userId = req.user._id;

    if (!videoId || !content || !userId) {
        throw new ApiError(400, "Video , content or user not available so not be commented")
    }

    const comment = await Comment.create({
        content : content,
        video : videoId,
        owner : userId
    })

    if (!comment) {
        throw new ApiError(400, "Comment not created")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            comment,
            "Successfully commented"
        )
    )

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params;
    const {content} = req.body;

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            content : content
        },
        {new : true}
    )

    return res.status(200).json(
        new ApiResponse(201, updatedComment, "Successfully updated")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params;
    const deletedComment = await Comment.findByIdAndDelete(
        commentId
    )

    if (!deletedComment) {
        throw new ApiError(400 , "Comment deletition failed.");
        
    }

    return res.status(200).json(
        new ApiResponse(201, deletedComment, "Successfully deleted")
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
