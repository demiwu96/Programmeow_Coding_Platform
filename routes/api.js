const express = require("express");
const router = express.Router();
const User = require("../model/User");
const Question = require("../model/Question");
const {questionList} = require("../question");
const passport = require("../auth/passport");
const jwt = require('jsonwebtoken');

// Submit code was clicked. We should write a middleware for executing and validate code
router.post("/submit", (req,res) => {
    const userAnswer = req.body.cacheInput;
    // We are only interested in cacheInput
    // console.log(userAnswer);
});

// Route for saving cacheInput automatically
router.post("/save", async (req, res) => {
    const { _id, cacheInput } = req.body;
    return await Question.findByIdAndUpdate(_id, {cacheInput});
    // No need to sendback the updatedQuestion because frontend was already updated!
});

// This route handles creation of a new user and handle duplication
router.post("/signup", async (req,res) => {
 
    const { username, email, password } = req.body;
    // CHeck if already exist with the email or username or not
    const duplicateUser = await User.findOne({$or: [{username}, {email}]});
    if(duplicateUser){
        // Found a duplicate user
        console.log("Found duplicate");
        return res.json({
            msg: "User existed"
        });
    }

    const createQuestions = async () => {
        return Promise.all(questionList.map(async (item) => {
            const question = await Question.create(item);
            return question;
        }));
    }

    const questionData = await createQuestions();

    const user = await User.create({
        username: username,
        email: email,
        password: password,
        lastQuestionID: "",
        questions: questionData
    });

    // Issue JWT Token
    const token = jwt.sign(user.toJSON(), 'secret');
    return res.json({
        msg: "Successfully create a new user",
        token: token,
    }); 

})

// Log in and authenticate route
router.post("/login", async (req,res) => {
    
    try {
        const { username, password } = req.body;
    
        // Check user in database
        const user = await User.findOne({username});
        
        if(!user){
            return res.json({
                msg: "User not found",
            });
        }

        if(password == user.password){
            const token = jwt.sign(user.toJSON(), 'secret');
            return res.json({
                success: true,
                token: token,
            }); 

        } else {
            // Wrong password
            return res.json({
                msg: "Incorrect credentials",
            });
        }
    } catch(e){
        throw e;
    } 
})

router.get("/auth", passport.authenticate('jwt', {session: false}), (req,res) => {
    return res.json({
        isAuthenticated: true,
        username: req.user.username,
        questions: req.user.questions,
        lastQuestionID: req.user.lastQuestionID
    });
});

// Called in UseEffect in QuestionDisplayPage to get selected question
router.post("/question",  async (req,res) => {
    // id represents the ID of the user last clicked on
    const { username, id } = req.body;

    try {
        const user = await User.findOneAndUpdate({username}, {lastQuestionID: id}).populate('questions').exec();
        const selectedQuestion = user.questions.filter(question => question["_id"] == id)[0];
        const { _id, title, description, difficulty, isSolved,
            type, cacheInput, beginningCode, solutionCode,
            inputOne, inputTwo, outputOne, outputTwo, } = selectedQuestion;

        return res.json({
            success: true,
            question: {
                _id, title, description, difficulty, isSolved,
            type, cacheInput, beginningCode, solutionCode,
            inputOne, inputTwo, outputOne, outputTwo
            }
        });
    } catch(e){
        return res.json({
            success: false,
            msg: "User with the specified name not found"
        });
    }
    
});

module.exports = router;