import { ObjectId, OptionalId } from "mongodb";

export type User = {
    id: string,
    name: string,
    password: string,
    email: string,
    posts: Post[],
    comments: Comment[],
    likedPosts: Post[]
}

export type UserModel = OptionalId<{
    name: string
    password: string,
    email: string,
    posts: ObjectId[],
    comments: ObjectId[],
    likedPosts: ObjectId[]
}>

export type UserInput = {
    name: string,
    password: string,
    email: string,
}
   
export type Post = {
    id: string,
    content: string,
    author: User,
    comments: Comment[],
    likes: User[]
}

export type PostInput = {
    content: string,
    author: string    
}

export type PostInputUpdate = {
    content: string
}

export type PostModel = OptionalId<{
    content: string,
    author: ObjectId,
    comments: ObjectId[],
    likes: ObjectId[]
}>
   
export type Comment =  {
    id: string
    text: string,
    author: User,
    post: Post
}

export type CommentInput = {
    text: string,
    author: string,
    post: string
}

export type CommentInputUpdate = {
    text: string
}

export type CommentModel =  OptionalId<{
    text: string,
    author: ObjectId,
    post: Post
}>