import mongoose, { isValidObjectId, mongo } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = -1, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    // const aggregationPipeline = [
    //     { $match: { _id : null} },  // No userId filter, fetches all videos
    //     { $sort: { [sortBy]: Number(sortType) } }
    // ];

    // if (userId) {
    //     const aggregationPipeline = [
    //         { $match: { ownerId :new  mongoose.Types.ObjectId(userId)} },  // No userId filter, fetches all videos
    //         { $sort: { [sortBy]: Number(sortType) } }
    //     ];
    // }

    // const options = {
    //     page : parseInt(page),
    //     limit : parseInt(limit)
    // }

    // const videosResult = await Video.aggregatePaginate(Video.aggregate(aggregationPipeline) , options)

    // return res.status(200)
    // .json(
    //     ApiResponse(
    //         200,
    //         videosResult,
    //         "Successfully retrieved all videos."
    //     )
    // )
    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    }
    const match = {};
    if (query) {
        match.title = { $regex: query, $options: "i" }
    }
    if (userId) {
        match.owner = new mongoose.Types.ObjectId(userId)
    }

    const pipelineAggregation = [
        {
            $match: match,
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                description: 1,
                owner: {
                    $arrayElemAt: ["$ownerDetails", 0]
                }
            }
        },
        { $sort: { [sortBy]: Number(sortType) } }
    ];

    const videosResult = await Video.aggregatePaginate(Video.aggregate(pipelineAggregation), options);

    return res.status(200).json(
        new ApiResponse(
            200,
            videosResult,
            "Successfully retreived all videos"
        )
    )

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video

    if (!title || !description) {
        throw new ApiError(400, "All fields are required");
    }

    const videoFilePath = req.files?.videoFile[0]?.path;
    const thumbnailFilePath = req.files?.thumbnail[0]?.path;

    if (!videoFilePath || !thumbnailFilePath) {
        throw new ApiError(400, "All fields are required");
    }

    const video = await uploadOnCloudinary(videoFilePath);
    const thumbnail = await uploadOnCloudinary(thumbnailFilePath);

    if (!video) {
        throw new ApiError(400, "Error while uploading video");
    }
    if (!thumbnail) {
        throw new ApiError(400, "Error while uploading thumbnail");
    }

    const createdVideo = await Video.create({
        videoFile: video?.url,
        thumbnail: thumbnail?.url,
        title,
        description,
        duration: video?.duration,
        isPublished: true,
        owner: req.user._id
    })

    return res.status(200).json(
        new ApiResponse(200, createdVideo, "Video Uplaoded successfully")
    )

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if (!videoId) {
        throw new ApiError(400, "Video not availabel");
    }

    
    const video  = await Video.findByIdAndUpdate(
        videoId,
        {
            $inc : {
                views : 1
            }
        },
        {
            new : true
        }
    )

    if (!video) {
        throw new ApiError(400, "Video not found")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Video Fetched Successfully."
        )
    )

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    if (!videoId) {
        throw new ApiError(400, "Video Id not recieved")
    }

    // const video = Video.findById(videoId)

    // if (!video) {
    //     throw new ApiError(400, "Video not found")
    // }

    const { title, description } = req.body;
    const thumbnail = req.file;
    let thumbnailPath;
    if (thumbnail) {
        const thumbnailLocalPath = req.file?.path;
        thumbnailPath = await uploadOnCloudinary(thumbnailLocalPath);
        if (!thumbnailPath) {
            throw new ApiError(400, "File not uploaded try again")
        }
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                ...(thumbnail && { thumbnail: thumbnailPath.url })
            }
        },
        { new: true }
    )

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Successfully updated"
        )
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if (!videoId) {
        throw new ApiError(400, "No id found")
    }

    const deleteVideo = await Video.findOneAndDelete({ _id: videoId });

    if (!deleteVideo) {
        throw new ApiError(400, "Video deleted successfully.");

    }

    return res.status(200).json(
        new ApiResponse(200, deleteVideo, "Video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400, "Video not availabel");
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(400, "Video not found")
    }

    video.isPublished = !video.isPublished;

    await video.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Toggled Successfully."
        )
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
