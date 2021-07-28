const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const httpError = require('../models/http-error');
const User = require('../models/user');
const user = require('../models/user');

const getUsers = async (req, res, next) => {
    let users
    try {
        users = await User.find({}, '-password');
    } catch (err) {
        return next(new httpError('Fetching users failed, please try again.', 500));
    }
    res.status(200).json({ users: users.map(user => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors);
        return next(new httpError('Invalid inputs passed, please check your Data.', 422));
    }
    const { name, email, password } = req.body;

    let existingUser;
    try {
        existingUser = await User.findOne({ email: email });
    } catch (err) {
        return next(new httpError('Failed to do existing user check.', 500));
    }

    if (existingUser) {
        return next(new httpError('Cannot create user, email-id already used.', 422));
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
        return next(new httpError('Could not create user, plaease try again.', 500));
    }

    const createdUser = new User({
        name,
        email,
        password: hashedPassword,
        image: req.file.path,
        places: []
    });

    try {
        await createdUser.save();
    } catch (err) {
        return next(new httpError('Signing up failed, please try again', 500));
    }

    let token;
    try {
        token = jwt.sign(
            {
                userID: createdUser.id,
                email: createdUser.email
            },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        )
    } catch (err) {
        return next(new httpError('Signing up failed, please try again', 500));
    }

    res.status(201).json({
        userID: createdUser.id,
        email: createdUser.email,
        token: token
    });
};

const login = async (req, res, next) => {
    const { email, password } = req.body;

    let userExists;
    try {
        userExists = await User.findOne({ email: email });
    } catch (err) {
        return next(new httpError('User not found,', 500));
    }

    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, userExists.password);
    } catch (err) {
        return next(new httpError('Something went wrong, please try again.', 500));
    }

    if (!userExists || !isValidPassword) {
        return next(new httpError('Invalid email-id or password', 403));
    }

    let token;
    try {
        token = jwt.sign(
            {
                userID: userExists.id,
                email: userExists.email
            },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        )
    } catch (err) {
        return next(new httpError('Something went wrong, please try again.', 500));
    }

    res.status(200).json({
        userID: userExists.id,
        email: userExists.email,
        token: token
    });
};


exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;