const mongoose = require('mongoose');
const Review = require('./review');
const Schema = mongoose.Schema;//due to this on line 4 we are using Schema({}) instead of mongoose.Schema({})

const campgroundSchema = new Schema({
    title: String,
    image: String,
    price: Number,
    description: String,
    location: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ]
});

campgroundSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await Review.deleteMany({
            _id: {
                $in: doc.reviews
            }
        })
    }
})

const Campground = new mongoose.model('Campground', campgroundSchema);
module.exports = Campground;