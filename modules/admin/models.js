const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const objectId = Schema.ObjectId;


const user = {
    _id: { type: objectId, auto: true },
    fname: { type: String, required: true },
    lname: { type: String, required: true },
    role: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    countryCode: { type: Number, required: true },
    phone: { type: Number, required: true },
    emailVerified: { type: Boolean, default: 0 },
    phoneVerified: { type: Boolean, default: 0 },
    org: { type: String, required: true },
    securityCode: Number,
    createdAt: Date,
    updatedAt: Date,
    status: { type: Boolean, default: 1 }
};
const userSchema = new Schema(user, { versionKey: false, timestamps: true });


// User Details
const userDetails = {
    _id: { type: objectId, auto: true },
    userId: { type: objectId, required: true },
    city: String,
    state: String,
    country: String,
    pinCode: String,
    region: String,
    timezone: String,
    createdAt: Date,
    updatedAt: Date
};
const userDetailsSchema = new Schema(userDetails, { versionKey: false, timestamps: true });

// User Group
const userCategory = {
  _id: { type: objectId, auto: true },
  category: {
    type: String,
    unique: true,
    required: true,
  },
  subCategory: [String],
  isDeleted: {
    type: Number,
    default: 0,
  },
  createdAt: Date,
  updatedAt: Date,
};

const userCategorySchema = new Schema(userCategory, { versionKey: false, timestamps: true });

// User Profile Pics
const userProfilePics = {
    _id: { type: objectId, auto: true },
    userId: { type: objectId, required: true },
    profilePics: String,
    createdAt: Date,
    updatedAt: Date
};
const userProfilePicsSchema = new Schema(userProfilePics, { versionKey: false, timestamps: true });


module.exports = {
    Auth: mongoose.model("admin", userSchema),
    Details: mongoose.model("adminDetails", userDetailsSchema),
    ProfilePics: mongoose.model("adminProfilePics", userProfilePicsSchema),
    UserCategory: mongoose.model("userCategory", userCategorySchema)
};