import { MongoClient } from 'mongodb'
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import {schema} from './schema.ts'
import { resolvers } from "./resolvers.ts";
import { CommentModel, PostModel, UserModel } from "./types.ts";

// Connection URL
const MONGO_URL = Deno.env.get("MONGO_URL");
if(!MONGO_URL){
  throw new Error("MONGO_URL not stablished");
}
const client = new MongoClient(MONGO_URL);

// Database Name
const dbName = 'P5';

// Use connect method to connect to the server
await client.connect();
console.log('Connected successfully to server');
const db = client.db(dbName);
const usersCollection = db.collection<UserModel>('users');
const postsCollection = db.collection<PostModel>('posts');
const commentsCollection = db.collection<CommentModel>('comments');

const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
});

const { url } = await startStandaloneServer(server, {context: async() => ({usersCollection, postsCollection, commentsCollection})});
console.log(`🚀 Server ready at ${url}`);