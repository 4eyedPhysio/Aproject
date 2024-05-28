const {Router}= require (`express`);
const User = require(`../model/users`);
const Post = require(`../model/posts`);
const {authentication, authorization}= require(`../middleware/auth_middleware`)

const routes = Router();
const jwt = require(`jsonwebtoken`);
require(`dotenv`).config();
const secret = process.env.SECRET_KEY;


//lets create the jwt token here

const maxAge= 60*60; //since the token is in secs and we want it to expire in one hour

//now to create the token
const createToken = (id)=>{
   return jwt.sign({id},secret,{
      expiresIn: maxAge
   });
}

routes.get('/', (req, res) => {
   res.render('index');
});


routes.get('/register', (req, res) => {
   res.render('register');
});

routes.post(`/register`,async function(req,res){

 const {First_name, Last_name,email,password,Date_registered}= req.body;
 console.log(req.body);

 try {
    const user = await User.create({First_name,Last_name, email, password, Date_registered});

    const token = createToken(user._id);
    res.cookie(`jwt`, token, {httpOnly:true, maxAge: maxAge*1000});


   //  res.status(200).json({message: `User registered successfully`, user});
   //  res.render('author_posts', { posts });
   res.render('index');
    console.log(`registration successful`)
 } catch (err) {
    res.status(400).json({message:`Unable to register`, error:err.message});
    console.log(err);
 }
});

routes.get('/login', (req, res) => {
   res.render('login');
});

routes.post(`/login`, async (req,res)=>{
   const {email, password}= req.body;
   try {
      if(!email||!password){
         return res.status(400).json({errors:{
            email:"email is required", password:"password is required"
         }})
      }else{
         const user = await User.login(email, password);
         const token =createToken(user._id);
         res.cookie(`jwt`,token, {httpOnly:true,maxAge: maxAge*1000});
         // res.status(200).json({user:user._id, message:"login successful"})

         console.log(`login successful`)
         return res.status(200).json({message:`login successful`});
      }
   } catch (err) {
      res.status(400).json({message:err.message})
   }
} )

//this route is for not logged in user


routes.get('/create-post', (req, res) => {
   res.render('createPost');
});


routes.post(`/blog`,authorization, async (req, res)=>{
   const {title, description, tags, body} = req.body;

   try {
      if(!req.user){
         return res.status(401).json({message:"unauthorized, please sign in"})
      }

      if (!title || !description || !body) {
         return res.status(400).json({ message: "Title, description, and body are required" });
     }

      

      //beneath this, we try to set the default values before creating them in the database
        const createdAt = new Date(); 
        const state = "draft"; 
        //concerning the read count , we will call it after the new post has been created
        const author= req.user._id
        

        const reading_time= await Post.readingTime(body);
         
      //after confirming if the person is authorized, then we go ahead in creating the post

      const newPost = await Post.create({
         title,
         description,
         tags,
         author,
         createdAt,
         state,
         reading_time,
         body
      });

    // this is where we add the read count
    await Post.readCount(newPost._id);
   // then we save all in the database
    await newPost.save();

      res.status(201).json({message:"post created",postId:newPost._id, post:newPost});
   } catch (err) {
      console.log("creating post failed", err);

      res.status(500).json({message:"error encountered"})
   }
})

routes.get('/search', async (req, res) => {
   res.render('search', { posts: [] });
});



routes.get(`/blog`, async (req, res) => {
   const author = req.query.author;
   const title = req.query.title;
   const tag = req.query.tag;
   const order = req.query.order === `descending` ? -1 : 1;  
   const timeField = req.query.timeField || `timestamp`;

   const query = { state: `published` };
   const page = req.query.page || 0;
   const contentsPerPage = 20;
   const skippedPage = page * contentsPerPage;

   try {
       if (author) {
           query.author = author;
       }

       if (tag) {
           query.tags = new RegExp(tag, `i`);
       }

       if (title) {
           query.title = new RegExp(title, `i`);
       }

       const sortOption = {};
       sortOption[timeField] = order;

       const posts = await Post.find(query)
           .sort(sortOption)
           .skip(skippedPage)
           .limit(contentsPerPage);

      //  if (posts.length === 0) {
      //      return res.status(404).json({ message: "Posts not found" });
      //  }
       res.render('blog', { posts });
      //  res.status(200).json({ posts });
   } catch (err) {
       console.error("Error retrieving posts:", err);
       res.status(500).json({ message: "Error returning posts", err: err.message });
   }
});



//this is the search route
routes.get('/blog/inputid',authorization, (req, res) => {
   res.render('search_id', { post: null });
});

routes.get('/blog/search', authorization, (req, res) => {
   const id = req.query.id;
   if (!id) {
       return res.status(400).json({ message: "search ID is required" });
   }
   res.redirect(`/blog/${id}`);
});


routes.get(`/blog/:id`, async (req,res)=>{
   const id = req.params.id;
   try {
      const postID =await Post.findOne({_id:id,state:"published"});
      if(!postID){
         return res.status(404).json({message:"post not found or published"});
      }

      //this line is to increase the readcount when the blogById is called
      postID.read_count= (postID.read_count || 0)+ 1;
      await postID.save();
      res.render('post', { post: postID });
      // return res.status(200).json({postID});

   } catch (err) {
      console.log(err.message);
      return res.status(500).json({message:"error getting Post", err})
   }
})


routes.get(`/blog/author/Post`,authorization, async(req, res)=>{
   const authorizedUserId = req.user.id
   const state = req.query.state;
   const page= parseInt(req.query.page)||0;
   const contentsPerPage = 20;
   const skippedPage = page * contentsPerPage;
   try {
       // since the state query is in our query so we have to get it out and use an if statement to check if it exists
        const query={author:authorizedUserId};
        if(state){
         query.state= state;
        }

      //turns out that i dont need to check if the user is authorized since my authorization function in the middleware already handles it. 

      const posts = await Post.find(query).skip(skippedPage).limit(contentsPerPage);
     // apparently in the code below, since posts returns an array and an empty array will return truthy , so its better we use the .length to check the if condition
      if(posts.length===0){
       return res.status(404).json({message:"post not found"})
      }
      res.render('author_posts', {
         posts,
         state,
         page,
         contentsPerPage
     });
      // return res.status(200).json({message:"Here are your blog post", posts});


   } catch (err) {
      return res.status(500).json({message:"Error returning your blog post", err});
   }
})



routes.get('/blog/state/edit', authorization, (req, res) => {
   res.render('input_id');
});


routes.get('/blog/state/update', authorization, (req, res) => {
   const id = req.query.id;
   if (!id) {
       return res.status(400).json({ message: "Post ID is required" });
   }
   res.redirect(`/blog/state/${id}/edit`);
});


//this next route is to update the state of the post
routes.get('/blog/state/:id/edit', authorization, async (req, res) => {
   const id = req.params.id;

   try {
       const post = await Post.findById(id);
       if (!post) {
           return res.status(404).json({ message: "Post not found" });
       }
       res.render('edit_state', { post });
   } catch (err) {
       console.log("Error fetching post", err);
       res.status(500).json({ message: "Error fetching post" });
   }
});



routes.put(`/blog/state/:id`,authorization,async (req,res)=>{
   const id = req.params.id;

   try {
      const post = await Post.findById(id);
      if(!post){
         res.status(404).json({message:"post not found"});
         console.log("post to update not found");
      }
      //time to create an algorithm that checks the state and edits it

      post.state = post.state === "draft" ? "published" : "draft";
      
      //then we save it
      await post.save();
      res.status(200).json({message:"Post state updated to publish successfully", post});
   } catch (err) {
      console.log("error updating blog's state",err);
      res.status(500).json({message:"error updating state"})
   }
});


routes.get('/blog/update/post',authorization, (req, res) => {
   res.render('update_id', { post: null });
});

routes.get('/blog/post/update', authorization, (req, res) => {
   const id = req.query.id;
   if (!id) {
       return res.status(400).json({ message: "Post ID is required" });
   }
   res.redirect(`/blog/update/${id}/edit`);
});


routes.get('/blog/update/:id/edit', authorization, async (req, res) => {
   const id = req.params.id;

   try {
       const post = await Post.findById(id);
       if (!post) {
           return res.status(404).json({ message: "Post not found" });
       }
       res.render('update_form', { post });
   } catch (err) {
       console.log("Error updating post", err);
       res.status(500).json({ message: "Error fetching post" });
   }
});


routes.post(`/blog/update/:id`, authorization, async(req,res)=>{
   const {title, description,tags,body}=req.body;
   const id= req.params.id;
   try {
      
     if(!req.user){
      return res.status(401).json({message:"user not logged in"})
   }
   const authorizedUserId = req.user.id;
   console.log(authorizedUserId);
   const post = await Post.findById(id);
   if(!post){
      return res.status(404).json({message:"post not found"});

   }
   //here is to allow edit for only the creator of the post 

   if(post.author.toString()!==authorizedUserId){
      return res.status(403).json({message:"unauthorized: Only author can update post"})
   }
   const reading_time= await Post.readingTime(body);
   post.title=title;
   post.description= description;
   post.tags= tags;
   post.body= body;
   post.reading_time =reading_time;
   post.read_count=(post.read_count||0)+1;


   await post.save();

   const message = "post successfully updated";
   res.status(200).json({message,post});
   } catch (err) {
      console.log("error updating post", err);
      res.status(500).json({message:"error updating post"});
   }
})




routes.put(`/blog/update/:id`, authorization, async(req,res)=>{
   const {title, description,tags,body}=req.body;
   const id= req.params.id;
   try {
      
     if(!req.user){
      return res.status(401).json({message:"user not logged in"})
   }
   const authorizedUserId = req.user.id;
   console.log(authorizedUserId);
   const post = await Post.findById(id);
   if(!post){
      return res.status(404).json({message:"post not found"});

   }
   //here is to allow edit for only the creator of the post 

   if(post.author.toString()!==authorizedUserId){
      return res.status(403).json({message:"unauthorized: Only author can update post"})
   }
   const reading_time= await Post.readingTime(body);
   post.title=title;
   post.description= description;
   post.tags= tags;
   post.body= body;
   post.reading_time =reading_time;
   post.read_count=(post.read_count||0)+1;


   await post.save();

   const message = "post successfully updated";
   res.status(200).json({message,post});
   } catch (err) {
      console.log("error updating post", err);
      res.status(500).json({message:"error updating post"});
   }
})






routes.get('/blog/delete/now',authorization, (req, res) => {
   res.render('delete', { post: null });
});

// routes.post('/blog/delete', authorization, async (req, res) => {
//    const id = req.body.postId;
//    const authorizedUserId = req.user.id;
//    try {
//        const post = await Post.findOneAndDelete({ _id: id, author: authorizedUserId });
//        if (!post) {
//            return res.status(404).json({ message: "Post not found or unauthorized to delete post" });
//        }
//        console.log("Deleted successfully");
//        res.render('delete', { post });
//    } catch (err) {
//        return res.status(500).json({ message: "Error deleting post", err });
//    }
// });

routes.post('/blog/delete-post', authorization, async (req, res) => {
   const id = req.body.postId;
   const authorizedUserId = req.user.id;
   try {
       const post = await Post.findOneAndDelete({ _id: id, author: authorizedUserId });
       if (!post) {
           return res.status(404).json({ message: "Post not found or unauthorized to delete post" });
       }
       console.log("Deleted successfully");
       res.render('delete', { post });
   } catch (err) {
       return res.status(500).json({ message: "Error deleting post", err });
   }
});




routes.get(`/logout`, async (req,res)=>{
   res.cookie(`jwt`, ``, {maxAge:1});
   // res.status(200).json({message:`logged out successfully`});

   res.render(`logout`);
   console.log(`logged out successfully`)
})


module.exports= routes;