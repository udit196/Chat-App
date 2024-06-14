const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const mongoose = require('mongoose');  // requiring the mongoose module
const passport = require('passport');  // requiring the passport module
const bodyParser = require('body-parser');  
const flash = require('connect-flash');
const session = require('express-session')
require('dotenv').config('./.env');
const app = express();

// Models
const Message = require('./models/Message');
const User = require('./models/Users');

let check = 0;
let user='John Doe';
let friend='John Doe';
const dbName = 'myapp';
const collectionName = 'messages';

app.use(express.static('public'));

// Atlas key
const url= `${process.env.url}`;
// const url= 'mongodb://127.0.0.1:27017/myapp';
mongoose.connect(url, {
  useNewUrlParser: true,
});

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'Rusty is a dog',
  resave: false,
  saveUninitialized: false
}));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());



// Profile page------------------------------------------------------------------------------------------
app.get('/profile', (req, res) => {
  // Check for success flash messages
  const successMessage = req.flash('success');
  
  // Render the dashboard with the success message
  res.render('profile', { successMessage });
});


// router for login-register form---------------------------------------------------------------------------- 
app.get('/', function (req, res) {
  
  if(check==1){
    res.render('login',{imageFileName:'loginpic.jpg'});
  }
  else{
    res.render('login',{imageFileName:'loginpic.jpg'});
  }
  
});

app.post("/login",(req,res)=>{
  const username = req.body.email;
  const password = req.body.password;
  
  User.findOne({email : username}).then((foundUser) => {
    if(foundUser.password===password){
      user=foundUser.name;
      check = 1;
      res.redirect('contact');
    }
    else{
      res.redirect('/');;
    }
  })
  .catch((err)=>{
    console.log(err);
  })     
});

// register page 
app.get('/register' , function(req,res){
  res.render('register',{imageFileName:'loginpic.jpg'});
});

app.post("/register",(req,res)=>{
  console.log(req.body);
  const newUser= new User({
    email :  req.body.email,
    name :   req.body.name,
    password: req.body.password
  });
  
  check = 1;
  user=req.body.name;
  newUser.save().then(()=>{
    
    res.redirect('contact');
    
  })
  .catch((err)=>{
    console.log("Error: koi to gadbad hai");
    res.render('register');
  })
});
// Contact Page------------------------------------------------------------------------------------

app.get('/contact', async (req, res) => {
  if(check==1){
    const users = await User.find().sort({ name: 'asc' });
    res.render('contact',{users,user});
  }
  else{
    res.redirect('/');
  }
});

app.post('/companion', async (req, res) => {
  friend = req.body.option;
  console.log(friend);
  res.redirect('/forum');
});

// Forum data---------------------------------------------------------------------------------------

app.get('/forum', async (req, res) => {
  if(check==1){
    try {
        if(user < friend){
          const messages = await Message.findOne({user1:user,user2:friend});
          res.render('discuss', { messages, friend, me:0});
        }
        else if(user == friend){
          const messages = await Message.findOne({user1:user,user2:friend});
          res.render('discuss', { messages, friend:'Me(You)' ,me:1 });
        }
        else{
          const messages = await Message.findOne({user1:friend,user2:user});
          res.render('discuss', { messages, friend ,me:1 });
        }
      } catch (err) {
        console.error(err);
      res.status(500).send('Internal Server Error');
      }
  }
  else{
    res.redirect('/');
  }
});
        
app.post('/add-message', async (req, res) => {
  const {message} = req.body;
    appendMessageToItem(user,friend, message).then(success => {
      res.redirect('/forum');
    });
});


//Handling user logout------------------------------------------------------------------------------

app.get("/logout", function (req, res) {
  check = 0;
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


async function appendMessageToItem(name, friend, message) {
  let client;
  try {
    client = new MongoClient(url);
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Create a filter to search for the item with the given name
    var filter = { user1: name ,user2:friend};
    var chk = 0;
    if(name >= friend){
      filter = { user1: friend, user2:name};
      chk = 1;
    }

    // Check if the item exists
    const item = await collection.findOne(filter);

    if (item) {
      // If the item exists, append the message to the container array
      const update = { $push: { container: {message, chk } } };
      await collection.updateOne(filter, update);
      console.log(`Message "${message}" appended to item "${name}"`);
    } else {
      // If the item doesn't exist, create a new record with the message in the container array
      var newItem;
      if(name < friend){
        newItem = { user1: name, user2 : friend, container: [{message,chk}] };
      }
      else{
        newItem = { user1: friend, user2 : name, container: [{message,chk}] };
      }
      await collection.insertOne(newItem);
      console.log(`New item created for "${name}" with message "${message}"`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    if (client) {
      client.close();
    }
  }
}

// ------------------------------------------------------------------------------------------------------
var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("Server Has Started!");
});