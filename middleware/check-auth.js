const jwt = require('jsonwebtoken');

const HttpError = require("../models/http-error");

const checkAuth = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }
    try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            throw new Error();
        }
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        req.userData = { userID: decodedToken.userID };
        return next();
    } catch (Err) {
        return next(new HttpError('Authentication failed', 403));
    }
};

module.exports = checkAuth;