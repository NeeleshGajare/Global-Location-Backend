const express = require('express');
const { check } = require('express-validator');

const placesController = require('../controllers/places-controller');
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

router.get('/:pid', placesController.getPlacesById);

router.get('/user/:uid', placesController.getPlacesByUserId);

router.use(checkAuth);

router.post('/',
    // fileUpload.single('image'),
    [check('title').notEmpty(), 
    check('description').isLength({ min: 5 }), 
    check('address').notEmpty(),
    check('image').notEmpty()],
    placesController.createPlace);

router.patch('/:pid',
    [check('title').notEmpty(), check('description').isLength({ min: 5 })],
    placesController.updatePlace);

router.delete('/:pid', placesController.deletePlace);

module.exports = router;