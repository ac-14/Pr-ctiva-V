import { Collection, ObjectId } from "mongodb";
import { CommentModel, PostModel, UserModel, UserInput, PostInput, PostInputUpdate, CommentInput, CommentInputUpdate } from "./types.ts";
import { encryptPassword } from "./utils.ts";

export const resolvers = {

    User: {
        id: (parent: UserModel) => {
            return parent._id?.toString();
        },
        
        posts: async(parent: UserModel, _:unknown , context:{postsCollection : Collection<PostModel>} ) => {
            const ids = parent.posts;
            const posts = await context.postsCollection.find({_id: {$in: ids}}).toArray();
            return posts;
        },
        comments: async(parent: UserModel, _: unknown, context: {commentsCollection: Collection<CommentModel>} ) => {
            const comments = await context.commentsCollection.find({_id: {$in: parent.posts}}).toArray();
            return comments;
        },
        likedPosts: async(parent: UserModel, _: unknown, context:{postsCollection: Collection<PostModel>} ) => {
            const posts = await context.postsCollection.find({_id: {$in: parent.likedPosts}}).toArray();
            return posts;
        },
        
    },

    Post: {
        id: (parent: PostModel) => {
            return parent._id?.toString();
        },
        author: async (parent:PostModel, _:unknown,context:{usersCollection: Collection<UserModel>} ) =>{
            const user = await context.usersCollection.findOne({_id: parent.author});
            return user;
        },

        comments: async(parent: PostModel, _:unknown,context: {commentsCollection: Collection<CommentModel>}) => {
            const comments = await context.commentsCollection.find({_id: {$in: parent.comments}}).toArray()
            return comments;
        },

        likes: async(parent: PostModel, _:unknown, context: {usersCollection: Collection<UserModel>}) => {
            const users = await context.usersCollection.find({_id: {$in: parent.likes}}).toArray();
            return users;
        }
    },
    Comment: {
        id: (parent: CommentModel) => {
            return parent._id?.toString();
        },

        author: async(parent: CommentModel, _:unknown, context: {usersCollection: Collection<UserModel>}) => {
            const author = await context.usersCollection.findOne({_id: parent.author});
            return author;
        },

        post: async(parent: CommentModel, _:unknown, context: {postCollection: Collection<PostModel>}) => {
            const post = await context.postCollection.findOne({_id: parent.post});
            return post;
        }
    },
    Query: {
        users: async (
            _:unknown, 
            __:unknown, 
            context : {usersCollection: Collection<UserModel>}
        ):Promise<UserModel[]> => {
            const usersDB = await context.usersCollection.find().toArray();
            return usersDB;
        },
        
        user: async (
            _: unknown,
            args: { id: string },
            ctx: { usersCollection: Collection<UserModel> },
        ): Promise<UserModel> => {
            const _id = new ObjectId(args.id)
            const user = await ctx.usersCollection.findOne({ _id })
            if(!user){
                throw new Error("user not found");
            }
            return user
        },

        posts: async (
            _: unknown,
            __: unknown,
            ctx: { postsCollection: Collection<PostModel> }
        ): Promise<PostModel[]> => {
            const postsDB = await ctx.postsCollection.find().toArray()
            return postsDB
        },
        
       post: async (
            _: unknown,
            args: { id: string },
            ctx: { postsCollection: Collection<PostModel> }
       ): Promise<PostModel> => {
            const _id = new ObjectId(args.id)
            const post = await ctx.postsCollection.findOne({ _id })
            if(!post){
                throw new Error("post not found");
            }
            return post
       },
        
        comments: async (
            _: unknown,
            __: unknown,
            ctx: { commentsCollection: Collection<CommentModel> }
        ): Promise<CommentModel[]> => {
            const commentsDB = await ctx.commentsCollection.find().toArray()
            return commentsDB
        },
        
        comment: async (
            _: unknown,
            args: { id: string },
            ctx: { commentsCollection: Collection<CommentModel> }
        ): Promise<CommentModel> => {
            const _id = new ObjectId(args.id)
            const comment = await ctx.commentsCollection.findOne({ _id })
            if(!comment){
                throw new Error("comment not found");
            }
            return comment
        }
        

    },
    Mutation: {
        createUser: async(
            _:unknown,
            {input}: {input: UserInput},
            ctx: {usersCollection : Collection<UserModel>}
        ) => {
            const existingUser = await ctx.usersCollection.findOne({ email: input.email });
            if (existingUser) {
                throw new Error("Email is already in use");
            }

            const encryptedPassword = await encryptPassword(input.password);
            
            const {insertedId} = await ctx.usersCollection.insertOne({
                name: input.name,
                password: encryptedPassword,
                email: input.email,
                posts: [],
                comments: [],
                likedPosts: []
            })
            
            const user = await ctx.usersCollection.findOne({_id: insertedId});
            return user;
        },

        updateUser: async(
            _:unknown,
            {id, input}: {id: string ,input: UserInput},
            ctx: {usersCollection : Collection<UserModel>}
        ):Promise<UserModel> => {
            const existingUser = await ctx.usersCollection.findOne({ email: input.email });
            if (existingUser && existingUser._id.toString() !== id) {
                throw new Error("Email is already in use");
            }

            const encryptedPassword = await encryptPassword(input.password); 
            await ctx.usersCollection.updateOne({_id: new ObjectId(id)},{
                $set: {
                    name: input.name,
                    password: encryptedPassword,
                    email: input.email,
                    posts: [],
                    comments: [],
                    likedPosts: []
                }
            })
            
            const user = await ctx.usersCollection.findOne({_id: new ObjectId(id)});
            if(user){
            return user
            } else{
                throw new Error("User not found")
            }
        },

        deleteUser: async (
            _: unknown,
            args: { id: string },
            ctx: { 
                usersCollection: Collection<UserModel>, 
                postsCollection: Collection<PostModel>, 
                commentsCollection: Collection<CommentModel>
            }
        ): Promise<boolean> => {
            const _id = new ObjectId(args.id)
            const userToDelete = await ctx.usersCollection.findOne({ _id })
            if(!userToDelete)
            {
                console.log("Error, user to delete not found")
                return false
            } 
            else
            {
                await ctx.usersCollection.deleteOne({_id})
                await ctx.postsCollection.deleteMany({author: _id})
                await ctx.commentsCollection.deleteMany({author: _id})
                
                const like = userToDelete.likedPosts;
                await ctx.postsCollection.updateMany(
                    { _id: { $in: like } },
                    { $pull: { likes: _id } }
                )
                return true
            } 
        },

        createPost: async (
            _:unknown, 
            {input}: {input: PostInput},
            ctx : {usersCollection: Collection<UserModel>,  postsCollection: Collection<PostModel> }
        ): Promise<PostModel> => {
            const author = await ctx.usersCollection.findOne({_id: new ObjectId(input.author)});
            if(author && input.content){

            const {insertedId} = await ctx.postsCollection.insertOne({
                content: input.content,
                author: new ObjectId(input.author),
                comments: [],
                likes: []
            })

            const newPost = await ctx.postsCollection.findOne({_id: insertedId});
            if(newPost){
            return newPost
            } else {
                throw new Error("Not able to create post")
            }

            } else {
                throw new Error("Author does not exist");
            }
        },

        deletePost: async (
            _: unknown,
            args: { id: string },
            ctx: { postsCollection: Collection<PostModel> }
        ): Promise<boolean> => {
            const _id = new ObjectId(args.id)
            const postToDelete = await ctx.postsCollection.findOne({ _id })
            if(!postToDelete)
            {
                console.log("Error, post to delete not found")
                return false
            } 
            else
            {
                await ctx.postsCollection.deleteOne({_id})
                return true
            } 
        },

        updatePost: async (
            _: unknown,
            {id, input} : {id: string, input: PostInputUpdate},
            ctx: { postsCollection: Collection<PostModel> }
        ):Promise<PostModel> => {
            await ctx.postsCollection.updateOne({_id: new ObjectId(id)}, {
                $set: { content: input.content },
            })

            const newPost = await ctx.postsCollection.findOne({_id: new ObjectId(id)});
            if(newPost){
            return newPost
            } else {
                throw new Error("Not able to create post")
            }
        },

        createComment: async (
            _:unknown, 
            {input}: {input: CommentInput},
            ctx : { usersCollection: Collection<UserModel>, commentCollection: Collection<CommentModel> }
        ): Promise<CommentModel> => {
            const author = await ctx.usersCollection.findOne({_id: new ObjectId(input.author)});
            if (!author) {
            throw new Error("Author does not exist");
            }

            const {insertedId} = await ctx.commentCollection.insertOne({
            text: input.text,
            author: new ObjectId(input.author),
            post: new ObjectId(input.post)
            })

            const newComment = await ctx.commentCollection.findOne({_id: insertedId});
            if(newComment){
            return newComment
            } else {
            throw new Error("Not able to create comment")
            }
        },

        deleteComment: async (
            _: unknown,
            args: { id: string },
            ctx : { commentCollection: Collection<CommentModel> }
        ): Promise<boolean> => {
            const _id = new ObjectId(args.id)
            const commentToDelete = await ctx.commentCollection.findOne({ _id })
            if(!commentToDelete)
            {
                console.log("Error, comment to delete not found")
                return false
            } 
            else
            {
                await ctx.commentCollection.deleteOne({_id})
                return true
            } 
        },

        updateComment: async (
            _: unknown,
            {id, input} : {id: string, input: CommentInputUpdate},
            ctx: { commentCollection: Collection<CommentModel> }
        ):Promise<CommentModel> => {
            await ctx.commentCollection.updateOne({_id: new ObjectId(id)}, {
                $set: { text: input.text },
            })

            const newComment = await ctx.commentCollection.findOne({_id: new ObjectId(id)});
            if(newComment){
            return newComment
            } else {
                throw new Error("Not able to update comment")
            }
        },

        addLikeToPost: async (
            _: unknown,
            args: { postId: string, userId: string },
            ctx: { postsCollection: Collection<PostModel>, usersCollection: Collection<UserModel> }
        ): Promise<PostModel> => {
            
            const postId = new ObjectId(args.postId)
            const userId = new ObjectId(args.userId)

            const user = await ctx.usersCollection.findOne({ _id: userId });
            if (!user) {
                throw new Error("User not found");
            }

            const postDB = await ctx.postsCollection.findOneAndUpdate(
                { _id: postId },
                { $push: { likes: userId } },
                { returnDocument: "after" }
            )

            if(!postDB){
                throw new Error("Post not found");
            }

            await ctx.usersCollection.updateOne(
                { _id: userId },
                { $push: { likedPosts: postId } }
            )

            return postDB;

        },

        removeLikeFromPost: async (
            _: unknown,
            args: { postId: string, userId: string },
            ctx: { postsCollection: Collection<PostModel>, usersCollection: Collection<UserModel> }
        ): Promise<PostModel> => {
            
            const postId = new ObjectId(args.postId)
            const userId = new ObjectId(args.userId)

            const user = await ctx.usersCollection.findOne({ _id: userId });
            if (!user) {
                throw new Error("User not found");
            }

            const postDB = await ctx.postsCollection.findOneAndUpdate(
                { _id: postId },
                { $pull: { likes: userId } },
                { returnDocument: "after" }
            )

            if(!postDB){
                throw new Error("Post not found. . .")
            }

            await ctx.usersCollection.updateOne(
                { _id: userId },
                { $pull: { likedPosts: postId } }
            )

            return postDB

        },

 
    }   
}