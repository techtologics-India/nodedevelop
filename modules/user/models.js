const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const objectId = Schema.ObjectId;


const user = {
  _id: { type: objectId, auto: true },
  fname: String,
  lname: String,
  name: String,
  role: {
    type: String,
    enum: ["artist", "business", "institution", "enthusiast"],
  },
  primaryRole: String,
  secondaryRole: [String],
  username: [String],
  password: String,
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please fill a valid email address",
    ],
  },
  countryCode: Number,
  phone: {
    type: Number,
    min: [11, "Please enter a valid Mobile Number"],
  },
  emailVerified: { type: Boolean, default: 0 },
  phoneVerified: { type: Boolean, default: 0 },
  followers: [String],
  following: [String],
  isProfilePrivate: { type: Boolean, default: 0 },
  isTCAccepted: { type: Boolean, default: 0 },
  isSupporter: { type: Boolean, default: 0 },
  emailSecurityCode: Number,
  phoneSecurityCode: Number,
  createdAt: Date,
  updatedAt: Date,
  status: { type: Boolean, default: 1 },
};
const userSchema = new Schema(user, { versionKey: false, timestamps: true });

const registration = {
    _id: { type: objectId, auto: true },
    fname: String,
    lname: String,
    email: String,
    phone: Number,
    userCategory: {
        type: String,
        enum: ["Artist"]
    },
    loginType: String,
    emailVerified: { type: Boolean, default: 0 },
    phoneVerified: { type: Boolean, default: 0 },
    username: String,
    password: String,
    followers: [String],
    following: [String],
    city: String,
    continent_code: Number,
    country: String,
    countryCallingCode: Number,
    country_capital: String,
    currency: String,
    ip: String,
    languages: [String],
    latitude: String,
    longitude: String,
    org: String,
    postal: Number,
    region: String,
    timezone: String,
    emailSecurityCode: Number,
    phoneSecurityCode: Number,
    status: { type: Boolean, default: 1 }
}
const registrationsSchema = new Schema(registration, { versionKey: false, timestamps: true });

// User Details
const userDetails = {
  _id: { type: objectId, auto: true },
  userId: { type: objectId, required: true },
  about: String,
  address: String,
  state: String,
  ip: String,
  city: String,
  region: String,
  region_code: String,
  country: String,
  country_name: String,
  country_code: String,
  country_capital: String,
  postal: String,
  latitude: Number,
  longitude: Number,
  timezone: String,
  country_calling_code: Number,
  languages: [String],
  currency: String,
  org: String,
  createdAt: Date,
  updatedAt: Date,
};
const userDetailsSchema = new Schema(userDetails, { versionKey: false, timestamps: true });


// User Group
const userGroup = {
    _id: { type: objectId, auto: true },
    userId: { type: objectId, required: true },
    group: String,
    subGroup: [String],
    createdAt: Date,
    updatedAt: Date
};
const userGroupSchema = new Schema(userGroup, { versionKey: false, timestamps: true });


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
    Auth: mongoose.model("user", userSchema),
    Details: mongoose.model("userDetails", userDetailsSchema),
    Group: mongoose.model("userGroup", userGroupSchema),
    ProfilePics: mongoose.model("userProfilePics", userProfilePicsSchema),
    Register: mongoose.model("registraions", registrationsSchema)
};