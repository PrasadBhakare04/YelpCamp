const Campground = require('../models/campground');
const { cloudinary } = require('../cloudinary');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geoCoder = mbxGeocoding({ accessToken: mapBoxToken });

module.exports.index = async (req, res) => {
    const campgrounds = await Campground.find({});
    res.render('campground/index', { campgrounds })
};

module.exports.renderNewForm = (req, res) => {
    res.render('campground/new')
};

module.exports.createCampground = async (req, res) => {
    const geoData = await geoCoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1
    }).send()
    const newCampground = new Campground(req.body.campground);
    newCampground.geometry = geoData.body.features[0].geometry;

    newCampground.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
    newCampground.author = req.user._id;
    await newCampground.save();
    req.flash('success', 'Successfully created a new Campground');
    res.redirect(`/campground/${newCampground._id}`)
};

module.exports.showCampground = async (req, res) => {
    // const { id } = req.params;
    const campground = await Campground.findById(req.params.id)
        .populate(
            {
                path: 'reviews',
                populate: {
                    path: 'author'
                }
            }
        )
        .populate('author');
    if (!campground) {
        req.flash('error', 'Cannot find that Campground');
        return res.redirect('/campground')
    }
    else {
        res.render('campground/show', { campground })
    }
};

module.exports.renderEditForm = async (req, res) => {
    // const { id } = req.params;
    const campground = await Campground.findById(req.params.id);
    if (!campground) {
        req.flash('error', 'Cannot find that Campground');
        return res.redirect('/campground')
    }
    res.render('campground/edit', { campground })
};

module.exports.updateCampground = async (req, res) => {
    const geoData = await geoCoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1
    }).send();
    const { id } = req.params;
    const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground });
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    await campground.images.push(...imgs);
    if (req.body.deleteImages) {
        for (let filename of req.body.deleteImages) {
            cloudinary.uploader.destroy(filename);
        }
        await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
    }
    campground.geometry = geoData.body.features[0].geometry;
    campground.save();
    req.flash('success', 'Successfully Updated the Campground');
    res.redirect(`/campground/${campground._id}`)
};

module.exports.deleteCampground = async (req, res) => {
    const { id } = req.params;
    await Campground.findByIdAndDelete(id);
    req.flash('success', 'Successfully Deleted the Campground');
    res.redirect('/campground')
}