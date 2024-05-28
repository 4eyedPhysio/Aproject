const mongoose = require(`mongoose`);

const User = require(`../model/users`);

const logger = require(`../middleware/logger`);



const postSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    tags:{
        type:[String],
        required:true
    },
    author:{
        type:mongoose.Schema.Types.ObjectId,
        ref: `User`,
        required:true
    },
    timeStamp:{
        type:Date,
        default:Date.now
    },
    state:{
        type:String,
        enum:[`draft`,`published`],
        default:`draft`
    },
    read_count:{
        type:Number,
        default:0
    },
    reading_time:{
        type:Number,
        default:0
    },
    body:{
        type: String,
        required:true
    }
})

postSchema.statics.readCount = async function(postId){
    try {
        //first we find the post we want to increment its read count
        const post = await this.findById(postId);
        //we add +one to it
        post.read_count+=1;
        //before we save it , we call the reading time while adding the read count
         const readingTime = await this.readingTime(post.body);

        post.reading_time = readingTime;

        logger.userLogger.log(`info`,`readcount updated successfully`);

        //then we save it to the database
        await post.save();

    } catch (err) {
        logger.userLogger.log(`error`,`readcount was not updated`);
        console.log(`error increasing read count`, err)
    }
}

postSchema.statics.readingTime = async function(body, NormalSpeed=183 ){
//so how the algorithm works is by dividing the whole page into individual words(white space) and using 200words per minute to get the estimated time it takes
if (!body || typeof body !== 'string') {
        throw new Error('Invalid body content');
    }

    const words = body.split(/\s+/).length;
    const readTime = Math.ceil(words / NormalSpeed);
    logger.userLogger.log(`info`,`readtime updated successfully`);
    return readTime;
}


const Post = mongoose.model('Post', postSchema);

module.exports = Post;