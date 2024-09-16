const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require("body-parser")
require('dotenv').config()
let mongoose = require("mongoose");
app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extedned : false}));

function main(){
  return mongoose.connect(process.env.MONGO_URL);
}

main().then(()=>{
  console.log("Database Connected ");
}).catch((err)=>{
  console.log("Error Occurred while Connecting databse ");
});

// --> schema 

let usereSchema = new mongoose.Schema({
  username  : String
});

let exerciseSchema = new mongoose.Schema({
    userId : String,
    username : String,
    description :{ type : String, required : true},
    duration : {type : Number, required : true},
    date : String,
});


// Models 
let User = mongoose.model("User", usereSchema);
let Exercise = mongoose.model("Exercise", exerciseSchema);

// end points 

app.get("/api/users/delete",(req, res)=>{
    User.deleteMany({}, (err, result)=>{
      if(err){
        console.log(err);
        res.json({
          message : "Deleted All Users Failed ",
        })
      }
      res.json({message : "all users Deleted "});
    })
});

// api to delete all exercises 
app.get('/api/exercises/delete', function (_req, res) {
	console.log('### delete all exercises ###'.toLocaleUpperCase());

	Exercise.deleteMany({}, function (err, result) {
		if (err) {
			console.error(err);
			res.json({
				message: 'Deleting all exercises failed!',
			});
		}

		res.json({ message: 'All exercises have been deleted!', result: result });
	});
});



app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.get('/api/users', async (_req, res) => {
  console.log('### GET ALL USERS ###'.toLocaleUpperCase());

  try {
    // Use await to handle the promise returned by find
    const users = await User.find({}).exec();

    if (users.length === 0) {
      return res.json({ message: 'There are no users in the database!' });
    }

    console.log('Users in database: '.toLocaleUpperCase() + users.length);

    res.json(users);
  } catch (err) {
    console.error(err);
    res.json({ message: 'Getting all users failed!' });
  }
});


// get route 

app.get("/api/users", (req, res)=>{
  User.find({}, (err, users)=>{
    if(err){
      console.error(err);
      res.json({
        message: "Getting All Users Failed! ",
      });
    }
    if(users.lenght == 0){
      res.json({message : "tehre are no users in the database ! "});
    }
    console.log("Users in database ".toLocaleUpperCase())
    res.json(users);
  });
});

// create a new Users 
app.post("/api/users", async (req, res)=>{
    const inputUsername = req.body.username;

    let newUser = new User({username : inputUsername});
    await newUser.save();
    res.json({ username : newUser.username, _id : newUser._id});

});
// exercsie route 
app.post("/api/users/:_id/exercises", async (req, res) => {
  let userId = req.params._id;
  let description = req.body.description;
  let duration = req.body.duration;
  let date = req.body.date;

  // if date is not provided
  if (!date) {
    date = new Date().toISOString().substring(0, 10);
    // explanation
    /*
    new Date() creates a Date object for the current date and time.
    .toISOString() converts it to a string in ISO 8601 format (YYYY-MM-DDTHH:MM:SS.sssZ).
    .substring(0,10) extracts just the date (YYYY-MM-DD) from the ISO string.
    */
  }

  try {
    // Use await to handle the promise returned by findById
    const userInDb = await User.findById(userId).exec();
    
    if (!userInDb) {
      return res.json({ message: "There is no user with that ID" });
    }

    const newExercise = new Exercise({
      userId: userInDb._id,
      username: userInDb.username,
      description: description,
      duration: parseInt(duration),
      date: date,
    });

    // Use await to handle the promise returned by save
    const exercise = await newExercise.save();

    res.json({
      username: userInDb.username,
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
      _id: userInDb._id,
    });
  } catch (err) {
    console.error(err);
    res.json({ message: 'An error occurred!' });
  }
});

// get
app.get('/api/users/:_id/logs', async function (req, res) {
	const userId = req.params._id;
	const from = req.query.from || new Date(0).toISOString().substring(0, 10);
	const to =
		req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
	const limit = Number(req.query.limit) || 0;

	console.log('### get the log from a user ###'.toLocaleUpperCase());

	//? Find the user
	let user = await User.findById(userId).exec();

	console.log(
		'looking for exercises with id ['.toLocaleUpperCase() + userId + '] ...'
	);

	//? Find the exercises
	let exercises = await Exercise.find({
		userId: userId,
		date: { $gte: from, $lte: to },
	})
		.select('description duration date')
		.limit(limit)
		.exec();

	let parsedDatesLog = exercises.map((exercise) => {
		return {
			description: exercise.description,
			duration: exercise.duration,
			date: new Date(exercise.date).toDateString(),
		};
	});

	res.json({
		_id: user._id,
		username: user.username,
		count: parsedDatesLog.length,
		log: parsedDatesLog,
	});
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
