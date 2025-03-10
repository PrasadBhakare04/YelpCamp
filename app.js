if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const ExpressError = require('./Utils/ExpressError');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const mongoSanitize = require('express-mongo-sanitize');
const dbUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/yelp-camp';
const mongoStore = require('connect-mongo');

mongoose.connect(dbUrl);
const db = mongoose.connection;
db.on('error', console.error.bind(console, "connection error:"));
db.once('open', () => {
    console.log("Database Connected");
})

const campgroundRoutes = require('./routes/campgrounds');
const reviewRoutes = require('./routes/reviews');
const userRoutes = require('./routes/user');

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set(path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('public'));
app.use(flash());
app.use(mongoSanitize());

const store = mongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret: 'thisshouldbeabettersecret!'
    }
})
const sessionConfig = {
    store,
    name: 'session',
    secret: 'thisshouldbesecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig));
app.use(express.static('public'));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next()
})

app.use('/campground', campgroundRoutes);
app.use('/campground/:id/reviews', reviewRoutes);
app.use('/', userRoutes)

app.get('/makeUser', async (req, res) => {
    const user = new User({ email: 'prasad@gmail.com', username: 'Prasad' });
    const newUser = await User.register(user, 'chicken');
    res.send(newUser);
})

app.get('/', (req, res) => {
    res.render('home')
});

app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404));
})

app.use((err, req, res, next) => {
    const { message = "Something Happened", statusCode = 500, stack } = err;
    // console.log(stack);
    res.status(statusCode).render('error', { message, statusCode })
})

app.listen(3000, () => {
    console.log('Serving on port 3000')
});