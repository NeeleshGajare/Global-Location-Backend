const { validationResult } = require('express-validator');
const fs = require('fs');

const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');
const mongoose = require('mongoose');

const getPlacesById = async (req, res, next) => {
    const placeId = req.params.pid;
    let place;
    try {
        place = await Place.findById(placeId);
    } catch (err) {
        return next(new HttpError('Getting place failed, please try again.', 500));
    }
    if (!place) {
        return next(new HttpError('Could not find a place for the provided id.', 404));
    }
    res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
    const userId = req.params.uid;
    let userPlaces;
    try {
        userPlaces = await Place.find({ creator: userId });
    } catch (err) {
        return next(new HttpError('Finding place by creator failed, please try again.', 500))
    }

    if (userPlaces.length === 0) {
        return next(new HttpError('Could not find a place for the provided user id.', 404));
    }
    res.json({ Places: userPlaces.map(place => place.toObject({ getters: true })) });
};

const createPlace = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors);
        return next(new HttpError('Invalid inputs passed, please check your Data.', 422));
    }
    // let { title, description, coordinates, address } = req.body;
    let { title, description, coordinates, address, image } = req.body;

    if (!coordinates) {
        try {
            coordinates = await getCoordsForAddress(address);
        } catch (error) {
            return next(error);
        }
    }
    const createdPlace = new Place({
        title,
        description,
        address,
        location: coordinates,
        // image: req.file.path,
        image,
        creator: req.userData.userID
    });

    let user;
    try {
        user = await User.findById(req.userData.userID);
    } catch (err) {
        return next(new HttpError('Creating place failed, please try again.', 500));
    }

    if (!user) {
        return next(new HttpError('Could not find user for providerd creator', 404));
    }
    // console.log(user);

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction()
        await createdPlace.save({ session: sess });
        user.places.push(createdPlace);
        await user.save({ session: sess });
        sess.commitTransaction();
    } catch (err) {
        return next(new HttpError('Creating place failed, please try again.', 500));
    }

    res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors);
        return next(new HttpError('Invalid inputs passed, please check your Data.', 422));
    }
    const { title, description } = req.body;
    const placeId = req.params.pid;

    let place;
    try {
        place = await Place.findById(placeId);
    } catch (err) {
        return next(new HttpError('Getting place failed, please try again.', 500));
    }
    
    if(place.creator.toString() !== req.userData.userID){
        return next(new HttpError('You are not allowed to edit this place.', 401));
    }

    place.title = title;
    place.description = description;

    try {
        await place.save();
    } catch {
        return next(new HttpError('Updating place failed, please try again.', 500));
    }
    res.status(200).json({ place: place.toObject({ getters: true }) });
}

const deletePlace = async (req, res, next) => {
    const placeId = req.params.pid;

    let place;
    try {
        place = await Place.findById(placeId).populate('creator');
    } catch (err) {
        return next(new HttpError('Failed to Get the place, please try again.', 500));
    }

    if (!place) {
        return next(new HttpError('Could not find the place to delete.', 404));
    }
    
    if(place.creator.id !== req.userData.userID){
        return next(new HttpError('You are not allowed to delete this place.', 401));
    }

    const imagePath = place.image;

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await place.remove({ session: sess });
        place.creator.places.pull(place);
        await place.creator.save({ session: sess });
        sess.commitTransaction();
    } catch (err) {
        return next(new HttpError('Deleting place failed, please try again.', 500));
    }

    fs.unlink(imagePath, err => {
        if (err) {
            console.log(err);
        }
    });
    res.status(200).json({ message: 'Place deleted successfully!' });
}


exports.getPlacesById = getPlacesById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
