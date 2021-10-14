const express = require('express');
const jwt = require("jsonwebtoken");
const multer = require('multer');
const axios = require("axios");
const bcrypt = require("bcrypt");333
const {OAuth2Client} = require("google-auth-library");
const fetch = require("node-fetch");
const ObjectId = require("mongoose").Types.ObjectId;

const client = require("twilio")(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);


const User = require('./models');
const adminModel = require('../admin/models')
const config = require('../../helper/config');
const userMiddleware = require('../../middleware/user');
const email = require('../../middleware/email');
const uploadMiddleware = require('../../middleware/uploadImage');

const router = express.Router();

const storage = multer.memoryStorage()
const upload = multer({ storage: storage });

// Google Authentication
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Get All User Information. This is Only for Admin User
router.get("/info/:id", (req, res) => {
    const id = req.params.id;
    User.Auth.findById(id, (err, data) => {
        if (err) {
            res.status(400).json({err})
        } else {
            let obj = {
                fname: data.fname,
                lname: data.lname,
                role: data.role,
                username: data.username,
                email: data.email,
                countryCode: 91,
                phone: `+${data.countryCode}-${data.phone}`,
                emailVerified: data.emailVerified,
                phoneVerified: data.phoneVerified
            };
            res.send(obj);
        }
    });
});

// login 
router.post("/login", (req, res) => {
    let obj = {
        email: req.body.email,
        password: req.body.password,
        status: true
    };
    
    User.Auth.findOne(obj, (err, data) => {
        if (err) {
            res.status(400).json({err})
        } else {
            if (data == null) {
                res.status(401).json({ error: "Username & password is not Valid" });
            } else {
                let obj = { id: data._id, email: data.email };
                let token = jwt.sign(obj, config.secrateKey, {
                    expiresIn: 1800 // expires in 30 minutes
                    
                });
                let refreshToken = jwt.sign(obj, config.refreshSecrateKey, {
                    expiresIn: '14d' // expires in 14 days
                });
                res.cookie("access-token", token, { httpOnly: true, maxAge: 1000 * 60 * 30 });
                res.cookie("refresh-token", refreshToken, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 14 });

                res.json({
                    id: data._id,
                    email: data.email,
                    role: data.role
                });
            }
        }
    });
});


// sign-up
router.post("/signup", userMiddleware.checkExistingUser, (req, res) => {
    let model = new User.Auth(req.body);
    if(!userMiddleware.validatePassword(req.body.password))
              return res.status(400).json({message: "Invalid Password. Password should between 7 to 15 characters which contain at least one numeric digit and a special character"})
    // if(!userMiddleware.validatePhone(req.body.phone))
    //           return res.status(400).json({message: "Invalid Mobile Number."})
    // if(!userMiddleware.validateEmail(req.body.email))
    //           return res.status(400).json({message: "Invalid Email."})
    model.save((err, user) => {
        if (err) {
            res.send(err.message);
        } else {
            const emailSecurity = userMiddleware.emailSecurityCode();
            const phoneSecurity = userMiddleware.phoneSecurityCode();
            User.Auth.findOneAndUpdate(
              { _id: user._id },
              {
                emailSecurityCode: emailSecurity,
                phoneSecurityCode: phoneSecurity,
              },
              {
                timestamps: { createdAt: false, updatedAt: true },
              },
              (err, data) => {
                if (err) {
                  res.status(400).json({err})
                } else {
                  if (req.body.email) {
                    let obj = { id: data._id, email: data.email };
                    let token = jwt.sign(obj, config.secrateKey, {
                      expiresIn: 1800, // expires in 30 minuites
                    });
                    let refreshToken = jwt.sign(obj, config.refreshSecrateKey, {
                      expiresIn: "14d", // expires in 14 days
                    });
                    res.cookie("accessToken", token, {
                      maxAge: 1000 * 60 * 30,
                      sameSite: 'lax'
                    });
                    res.cookie("refreshToken", refreshToken, {
                      maxAge: 1000 * 60 * 60 * 24 * 14,
                      sameSite: 'lax'
                    });
                    let userInfo = {
                        success: true,
                        message: "User Signed-up Successfully",
                        id: data._id,
                        email: data.email,
                    };
                    const securityCodeText = "Verification Code is " + emailSecurity;
              email(
                data.email,
                "Security Code",
                securityCodeText,
                "verificationCode",
                { code: `${emailSecurity}`, userEmail: `${data.email}` }
              ).then(
                (send) => {
                  res.status(200).json(userInfo);
                },
                (err) => {
                  console.log(err);
                  res.status(400).send(err);
                }
              );
                  } else if (req.body.phone) {
                    // userMiddleware.updateSecurityCodes(data._id);
                    console.log("Phone");
                    userPhone = `+${data.phone}`;
                    console.log(userPhone);
                    client.messages
                      .create({
                        body: `Your Verification code For zamzam is ${phoneSecurity}`,
                        messagingServiceSid: process.env.MSGSSID,
                        to: userPhone,
                      })
                      .then((messages) => console.log(messages))
                      .catch((err) => console.error(err));
                    res.status(200).send({
                      id: data._id,
                      success: true,
                      message:
                        "Registraion Successful. Verification code is sent to users mobile number",
                    });
                  } else {
                    res.json(phoneSecurity || emailSecurity );
                  }
                }
              }
            );
        }
    });
});


// add user name
router.put(
    "/addUserName/:id",
    userMiddleware.checkExistingUsername,
    (req, res) => {
      let id = req.params.id;
      if(!userMiddleware.validateUserName(req.body.username))
              return res.status(400).json({message: "Invalid username."})
      User.Auth.findOneAndUpdate(
        { _id: id },
        { username: req.body.username },
        {
          timestamps: { createdAt: false, updatedAt: true },
        },
        (err, data) => {
          if (err) {
            res.status(400).send(err);
          } else {
            regText = `You have Successfully registered`;
            email(
              data.email,
              "Registration Success",
              regText,
              "registrationSuccess",
              { firstName: `${data.fname || data.name}`, username: `${req.body.username}` }
            );
            res.status(200).json({
              success: true,
              message: "username added successfully",
              id: data._id
            });
          }
        }
      );
    }
  );


router.put("/addRegUserName/:id", userMiddleware.checkExistingUsername, (req, res) => {
    let id = req.params.id;
    User.Register.findOneAndUpdate({ _id: id }, { username: req.body.username }, { 
        timestamps: { createdAt:false, updatedAt:true } 
    }, (err, data) => {
        if (err) {
            res.status(400).json({err})
        } else {
            res.status(200).json({data})
        }
    });
});

router.put("/addUserInfo/:id", userMiddleware.verifyToken, (req, res) => {
    let id = req.params.id;
    User.Auth.findOneAndUpdate({ _id: id }, req.body, {
        timestamps: { createdAt:false, updatedAt:true }
    }, (err, data) => {
        if (err) {
          res.status(400).json({ err });
        } else {
          res.status(200).json({ data });
        }
    });
});

router.post("/forgotPassword", (req, res) => {
    User.Auth.findOne(req.body, (err, user) => {
        if (err) {
            res.status(400).json({err})
        } else {
            if (!user) {
                res.status(404).send("No User Found");
            } else {
                const url = 'localhost:3000/user/forgotpassword?id=' + user.id;
                const resetUrlText = "Reset url is <a href='" + url + "'>" + url + "</a>";
                const resetUrlTemplate = "Reset url is <a href='" + url + "'>" + url + "</a>";

                email(user.email, 'Reset Url', resetUrlTemplate, resetUrlText).then(data => {
                    res.send(data);
                }, err => {
                    res.status(400).json({err})
                });
            }
        }
    })
});

//Change Password
router.post('/changePassword', (req, res) => {
    const userId = req.body.id;
    const password = req.body.password;

    User.Auth.findById(userId, (err, user) => {
        if (err) {
            res.json({
                error: err,
                message: "Id is not correct"
            });
        } else {
            if (user == null) {
                res.status(404).send("User id not found");
            } else {
                User.Auth.findOneAndUpdate({ _id: userId }, { password: password }, {
                    timestamps: { createdAt:false, updatedAt:true } 
                }, (err, data) => {
                    if (err) {
                        res.status(400).json({err});
                    } else {
                        res.status(200).json({message: "Password updated successfully."});
                    }
                });
            }
        }
    });
});


// Active Previous Deactivated User. & Deactivate Active User.
router.put("/activeDeactivateUser/:id", (req, res) => {
    let id = req.params.id;
    let status = req.body;
    User.Auth.findById(id, (err, user) => {
        if (err) {
            res.json({
                error: err,
                message: "Id is not correct"
            });
        } else {
            if (user == null) {
                res.status(404).send("User id not found");
            } else {
                User.Auth.findOneAndUpdate({ _id: id }, status, {
                    timestamps: { createdAt:false, updatedAt:true }
                }, (err, data) => {
                    if (err) {
                        res.status(400).json({err})
                    } else {
                        if (req.body.status == false) {
                            res.status(200).json({
                                status: 'succes',
                                data: "User is Deactivated",
                            });
                        }
                        res.status(200).json({
                            status: 'succes',
                            data: "User is Activated",
                        });
                    }
                });
            }
        }
    });
});


/**
 * Verify Phone
 *  */
router.get("/generateVarificationCode/:type/:id", userMiddleware.getUserInfo, (req, res) => {
    const type = req.params.type;      // For Mail & Send Message
    const id = req.params.id;
    const securityCode = userMiddleware.generateSecurityCode();
    const securityCodeText = "Varification Code is " + securityCode;
    const securityCodeTemplate = "<h1>Email varification code is " + securityCode + "</h1>";
    User.Auth.findOneAndUpdate({ _id: id }, { securityCode: securityCode }, {
        timestamps: { createdAt:false, updatedAt:true } 
    }, (err, user) => {
        if (err) {
            res.status(400).json({err})
        } else {
            // For Mail & Send Message
            if (type == 'email') {
                email(user.email, 'Security Code', securityCodeTemplate, securityCodeText).then(data => {
                    res.send(data);
                }, err => {
                    console.log(err);
                    res.status(400).json({err})
                });
            } else {
                res.send(securityCode);
            }
        }
    })
});

router.put("/verification/:type/:id", async (req, res) => {
  const obj = {};
  const id = req.params.id;
  const type = req.params.type;
  const emailSecurity = req.body.emailSecurityCode;
  const phoneSecurity = req.body.phoneSecurityCode;

  if (type == "email") {
    obj.emailVerified = true;
  } else {
    obj.phoneVerified = true;
  }

  await User.Auth.findById(
    id,
    { emailSecurityCode: 1, phoneSecurityCode: 1, email: 1, phone: 1 },
    (err, code) => {
      if (err) {
        res.status(400).send(err);
      } else {
        if (
          code.emailSecurityCode == emailSecurity ||
          code.phoneSecurityCode == phoneSecurity
        ) {
          User.Auth.findByIdAndUpdate(id, obj, (err, data) => {
            if (err) {
              res.status(400).send(err);
            } else {
              res.status(200).send({
                success: true,
                message: `Users ${type} has verified`,
              });
              VerificationText = `You have successfully verified your ${type}`;
              email(
                code.email,
                "Verification Success",
                VerificationText,
                "verificationSuccess",
                { verificationType: `${type}` }
              );
            }
          });
        } else {
          res.status(200).send({
            success: false,
            message: `Users ${type} has not verified. Because you have entered wrong Security Code`,
          });
        }
      }
    }
  );
});

router.put("/register/verification/:type/:id", (req, res) => {
    const obj = {};
    const id = req.params.id;
    const type = req.params.type;
    const emailSecurity = req.body.emailSecurityCode;
    const phoneSecurity = req.body.phoneSecurityCode;

    if (type == "email") {
        obj.emailVerified = true;
    } else {
        obj.phoneVerified = true;
    }

    User.Register.findById(id, { emailSecurityCode: 1, phoneSecurityCode: 1 }, (err, code) => {
        if (err) {
            res.status(400).send(err);
        } else {
            if (code.emailSecurityCode == emailSecurity || code.phoneSecurityCode == phoneSecurity) {
                User.Register.findByIdAndUpdate(id, obj, (err, data) => {
                    if (err) {
                        res.status(400).json({err})
                    } else {
                        res.status(200).send({
                            success: true,
                            message: `Users ${type} has verified`
                        });
                    }
                });
            } else {
                res.status(200).send({
                    success: false,
                    message: `Users ${type} has not verified. Because you have entered wrong Security Code`
                });
            }
        }
    });
});

/**
 * Insert User Details
 *  */
// Insert Logged in User Details
router.post("/insertUserDetails", userMiddleware.verifyToken, (req, res) => {
    let obj = req.body;
    let model = new User.Details(obj);
    model.save((err, user) => {
        if (err) {
            res.status(400).send(err);
        } else {
            res.send(user);
        }
    })
});

// Get Logged in User Details
router.get("/userDetails/:id", userMiddleware.verifyToken, (req, res) => {
    let id = req.params.id;
    User.Details.findOne({ userId: id }, (err, data) => {
        if (err) {
            res.status(400).json({err})
        } else {
            res.status(200).json({data})
        }
    });
});


// Update User Details
router.put("/updateUserDetails/:id", userMiddleware.verifyToken, (req, res) => {
    const id = req.params.id;
    const obj = req.body;
    User.Details.findOneAndUpdate({ userId: id }, obj, { 
        timestamps: { createdAt:false, updatedAt:true } 
    }, (err, data) => {
        if (err) {
            res.status(400).json({err})
        } else {
            res.send("Data Updated Successfully");
        }
    });
});


/**
 * Insert User Group
 *  */
// Insert Logged in User Group
router.post("/addUserGroup", userMiddleware.verifyToken, (req, res) => {
    let obj = req.body;
    let model = new User.Group(obj);
    model.save((err, user) => {
        if (err) {
            res.status(400).json({err})
        } else {
            res.send('User Data Inserted');
        }
    })
});

// Get Logged in User Group
router.get("/userGroup/:id", userMiddleware.verifyToken, (req, res) => {
    let id = req.params.id;
    User.Group.findOne({ userId: id }, (err, data) => {
        if (err) {
            res.status(400).json({err})
        } else {
            res.send(data);
        }
    });
});

router.post('/uploadProfilePics/:id', userMiddleware.verifyToken, upload.single("profile"), uploadMiddleware.uploadImage, (req, res) => {
    let obj = {
        userId: req.params.id,
        profilePics: req.file.originalname
    }
    let model = new user.ProfilePics(obj);
    model.save((err, profile) => {
        if (err) {
            res.status(400).json({err})
        } else {
            res.json('Profile picture uploaded successfully');
        }
    });
});



router.post('/auth/refresh-token', (req, res, next) => {
    let refToken = req.body.refToken;
    let obj = {...req.body.id,...req.body.email}
    if (!refToken) {
        res.status(401).send({ auth: false, message: 'No token provided.' })
    } else {
        jwt.verify(refToken, config.refreshSecrateKey, (err, decoded) => {
            if (err) {
                res.status(500).json({ auth: false, message: 'Failed to authenticate refresh token.', error: err });
            } else {
                let token = jwt.sign(obj, config.secrateKey, {
                    expiresIn: 1800 // expires in 30 minuites 
                });
                let refreshToken = jwt.sign(obj, config.refreshSecrateKey, {
                    expiresIn: '14d' // expires in 14 days
                    
                });
                res.cookie("access-token", token, { httpOnly: true, maxAge: 1000 * 60 * 30 });
                res.cookie("refresh-token", refreshToken, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 14 });
                res.status(200).json({
                    accessToken: token,
                    refreshToken: refreshToken
                });     
            }
        });
    }
});

router.post(
    "/register",
    (req, res) => {
        const pwd = Math.random().toString(36).slice(-8);
        obj = req.body;
        details = {...obj ,password: pwd}
      let model = new User.Register(details);
      model.save((err, user) => {
        if (err) {
          res.send(err.message);
        } else {
            const emailSecurity = userMiddleware.emailSecurityCode();
            const phoneSecurity = userMiddleware.phoneSecurityCode();
          User.Register.findOneAndUpdate(
            { _id: user._id },
            {
            emailSecurityCode: emailSecurity,
            phoneSecurityCode: phoneSecurity
            },
            {
              timestamps: { createdAt: false, updatedAt: true },
            },
            (err, data) => {
              if (err) {
                res.status(400).json({err})
              } else {
                if (req.body.email) {
                  let userInfo = {
                    success: true,
                    message: "User Registered Successfully",
                    id: data._id,
                    email: data.email,
                  };
                  const securityCodeText = "Verification Code is " + emailSecurity;
                  const securityCodeTemplate =
                    "<h1>Your zamzam verification code is " +
                    emailSecurity +
                    "</h1>";
                  email(
                    data.email,
                    "Security Code",
                    securityCodeTemplate,
                    securityCodeText
                  ).then(
                    (send) => {
                      // res.send(data);
                      res.status(200).json(userInfo);
                    },
                    (err) => {
                      console.log(err);
                      res.status(400).send(err);
                    }
                  );
                } else if (req.body.phone) {
                  console.log("Phone");
                  userPhone = `+91${data.phone}`
                  console.log(userPhone);
                  client.messages
                    .create({
                      body: `Your Verification code for zamzam is ${phoneSecurity}`,
                      messagingServiceSid: process.env.MSGSSID,
                      to: userPhone,
                    })
                    .then((messages) => console.log(messages))
                    .catch((err) => console.error(err));
  
                  res.status(200).send({ 
                    id: data._id,
                    success: true,
                    message: "Verification code is sent to users mobile number"
                });
                } else {
                  res.json(emailSecurity,phoneSecurity);
                }
              }
            }
          );
        }
      });
    }
  );

/* Google Authentication */

router.post("/auth/googlelogin", async (req, res) => {
    const {tokenId} = req.body;

    googleClient.verifyIdToken({idToken: tokenId, audience:process.env.GOOGLE_CLIENT_ID})
        .then(response => {
            // console.log(response.payload);
            const {name, email, email_verified} = response.payload;
            if(email_verified) {
                User.Auth.findOne({email}).exec(async (err, user) => {
                    if(err) {
                        return res.status(400).json({error: "Something went wrong..."});
                    } else {
                        if(user) {
                            // User already exists in DB
                            const token = jwt.sign({_id: user._id}, process.env.SecrateKey, {expiresIn: '10d'});
                            const {_id, name, email} = user;

                            res.status(200).json({token, user: {_id, name, email}});
                        } else {
                            // Create new user
                            const fname = name.split(' ').slice(0, 1).join(' ');
                            const lname = name.split(' ').slice(-1).join(' ');
                            const password = Math.random().toString(36).slice(-8);
                            const userCategory = req.body.userCategory;
                            const hashedPassword = await bcrypt.hash(password, 10);
                            const emailVerified = req.body.emailVerified;

                            const newUser = new User.Register({fname, lname, email, userCategory, password: hashedPassword, emailVerified});
                            newUser.save((err, data) => {
                                if(err) {
                                    return res.status(400).json({error: "Something went wrong..."});
                                } else {
                                    const token = jwt.sign({_id: data._id}, process.env.SecrateKey, {expiresIn: '7d'});
                                    const {_id, fname, lname, email, userCategory} = newUser;

                                    res.status(200).json({token, user: {_id, fname, lname, email, userCategory}});
                                }
                            });

                        }
                    }
                })
            }
        });
});

/* Facebook Authentication */

router.post("/auth/facebooklogin", async(req, res) => {
    const accessToken = req.body.accessToken;
    const userID = req.body.userID;
    
    let urlGraphFacebook = `https://graph.facebook.com/v2.11/${userID}/?fields=id,name,email&access_token=${accessToken}`;
    fetch(urlGraphFacebook, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(response => {
        const {email, name} = response;
        User.Auth.findOne({email}).exec(async (err, user) => {
            if(err) {
                return res.status(400).json({error: "Something went wrong..."});
            } else {
                if(user) {
                    // User already exists in DB
                    const token = jwt.sign({_id: user._id}, process.env.SecrateKey, {expiresIn: '10d'});
                    const {_id, name, email} = user;

                    res.status(200).json({token, user: {_id, name, email}});
                } else {
                    // Create new user
                    const fname = name.split(' ').slice(0, 1).join(' ');
                    const lname = name.split(' ').slice(-1).join(' ');
                    const password = Math.random().toString(36).slice(-8);
                    const userCategory = req.body.userCategory;
                    const hashedPassword = await bcrypt.hash(password, 10);

                    const newUser = new User.Register({fname, lname, email, userCategory, password: hashedPassword});
                    newUser.save((err, data) => {
                        if(err) {
                            return res.status(400).json({error: "Something went wrong..."});
                        } else {
                            const token = jwt.sign({_id: data._id}, process.env.SecrateKey, {expiresIn: '10d'});
                            const {_id, fname, lname, email, userCategory} = data;

                            res.status(200).json({token, user: {_id, fname, lname, email, userCategory}});
                        }
                    });

                }
            }
        });
    }).catch((err) => res.send(400).json(err));
});

router.post(
    "/checkUserNameAvailability/:id",
    userMiddleware.checkExistingUsername,
    (req, res) => {
      let id = req.params.id;
      User.Auth.findOne(
        { _id: id },
        (err, data) => {
          if (err) {
            res.status(400).send(err);
          } else {
            res.status(200).json({
              success: true,
              message: "username is available",
              id: data._id
            });
          }
        }
      );
    }
  );


router.get("/resendVerificationCode/:type/:id", (req, res) => {
  const type = req.params.type; // For Mail & Send Message
  const id = req.params.id;
  const emailSecurity = userMiddleware.emailSecurityCode();
  const phoneSecurity = userMiddleware.phoneSecurityCode();
  const securityCodeText = "Verification Code is " + emailSecurity;
  User.Auth.findOneAndUpdate(
    { _id: id },
    { emailSecurityCode: emailSecurity, phoneSecurityCode: phoneSecurity },
    {
      timestamps: { createdAt: false, updatedAt: true },
    },
    (err, user) => {
      if (err) {
        res.status(400).json({err})
      } else {
        // For Mail & Send Message
        if (type == "email") {
          email(
            user.email,
            "Security Code",
            securityCodeText,
            "verificationCode",
            { code: `${emailSecurity}`, userEmail: `${user.email}` }
          ).then(
            (data) => {
              res.send({
                success: true,
                message: "Verification Code has been sent your Email id",
              });
            },
            (err) => {
              console.log(err);
              res.status(400).json({err})
            }
          );
        } else if (type == "phone") {
          userPhone = `+${user.phone}`;
          console.log(userPhone);
          client.messages
            .create({
              body: `Your Verification code For zamzam is ${phoneSecurity}`,
              messagingServiceSid: process.env.MSGSSID,
              to: userPhone,
            })
            .then(
              (data) => {
                res.status(200).send({
                  success: true,
                  message: "Verification Code has been sent your Phone Number",
                });
              },
              (err) => {
                console.log(err);
                res.status(400).json({err})
              }
            );
        } else {
          res.send(emailSecurity, phoneSecurity);
        }
      }
    }
  );
});

router.put("/addEmail/:id", (req, res) => {
    let id = req.params.id;
    const emailSecurity = userMiddleware.emailSecurityCode();
    const securityCodeText = "Verification Code is " + emailSecurity;
    if(!userMiddleware.validateEmail(req.body.email))
          return res.status(400).json({message: "Invalid Email."})
    User.Auth.findOneAndUpdate(
      { _id: id },
      { email: req.body.email, emailSecurityCode: emailSecurity },
      {
        timestamps: { createdAt: false, updatedAt: true },
      },
      (err, data) => {
        if (err) {
          res.status(400).send(err);
        } else {
          email(
            req.body.email,
            "Security Code",
            securityCodeText,
            "verificationCode",
            { code: `${emailSecurity}`, userEmail: `${req.body.email}` }
          );
          res.status(200).json({
            id: data._id,
            success: true,
            message: "Email Added Successfully",
          });
        }
      }
    );
  });

router.put("/addPhone/:id", (req, res) => {
    let id = req.params.id;
    const phoneSecurity = userMiddleware.phoneSecurityCode();
    if(!userMiddleware.validatePhone(req.body.phone))
            return res.status(400).json({message: "Invalid Mobile Number."})
    User.Auth.findOneAndUpdate(
      { _id: id },
      { phone: req.body.phone, phoneSecurityCode: phoneSecurity },
      {
        timestamps: { createdAt: false, updatedAt: true },
      },
      (err, data) => {
        if (err) {
          res.status(400).send(err);
        } else {
          userPhone = `${data.phone}`;
          console.log(userPhone);
          client.messages
            .create({
              body: `Your Verification code For zamzam is ${phoneSecurity}`,
              messagingServiceSid: process.env.MSGSSID,
              to: userPhone,
            })
            .then((messages) => console.log(messages))
            .catch((err) => console.error(err));
          res.status(200).json({
            id: data._id,
            success: true,
            message: "Phone Added Successfully",
          });
        }
      }
    );
  });
  
  // Public User Profile Link
router.get('/profile/:user', (req,res)=> {
    User.Register.findOne({ username: req.params.user }, (err, data) => {
        if (err) {
            res.status(400).json({err});
        } else {
            if (data) {
                if (data.username == req.params.user) {
                }
                res.status(200).json({
                    success: true,
                    message: "User profile exists",
                    profileDetails: {
                        firstName: data.fname,
                        lastName: data.lname,
                        role: data.role,
                        Languages: data.languages
                    }
                });
            } else {
                res.status(400).send({
                    success: false,
                    message: "User profile Doesn't exists",
                });
            }
        }
    })
  })

// Get Primary User Roles
router.get("/getPrimaryRoles",userMiddleware.verifyToken, (req,res) =>{
  adminModel.UserCategory.aggregate(
    [
      { $match: { } },
      {
        $project: {
          _id: 0,
          Role: "$category",
        },
      },
    ], (err,data)=> {
    if (err) {
      res.status(400).json({
        success: false,
        message: err.message
      })
    }else {
      res.status(200).json({ success: true, data: data });
    }
  })
})

// Get Secondary User Roles
router.get("/getSecondaryRoles/:category", userMiddleware.verifyToken, (req,res) =>{
  adminModel.UserCategory.aggregate(
    [
      { $match: { category: req.params.category } },

      {
        $project: {
          _id: 0,
          subRoles: "$subCategory",
        },
      },
    ],
    (err, data) => {
      if (err) {
        res.status(400).json({
          success: false,
          message: err.message,
        });
      } else {
        res.status(200).json({ success: true, data: data[0] });
      }
    }
  );
})

router.post("/addLocation", userMiddleware.verifyToken, (req,res)=>{
  let obj = req.body;
  let model = new User.Details(obj);
  model.save((err, user) => {
      if (err) {
          res.status(400).json({err});
      } else {
          res.status(200).json({
            message: "User Location Added",
            id: user._id,
          });
      }
  })
});

// Get Search Locations
router.get("/searchLocation", userMiddleware.verifyToken, (req,res) =>{
  let searchKey = req.query.search;
  let searchObject = {
    $or: [
      {
        address: {
          $regex: searchKey,
          $options: "is",
        },
      },
      {
        city: {
          $regex: searchKey,
          $options: "is",
        },
      },
    ],
  };
  User.Details.aggregate(
    [
      { $match: { ...searchObject } },
    ], (err,data)=> {
    if (err) {
      res.status(400).json({
        success: false,
        message: err.message
      })
    }else {
      res.status(200).json({ message: "User locations", data: data });
    }
  })
})


router.put(
  "/addUserMainRole/:id/:role",
  userMiddleware.checkExistingUsername,
  userMiddleware.verifyToken,
  (req, res) => {
    let id = req.params.id;
    User.Auth.findOneAndUpdate(
      { _id: id },
      { primaryRole: req.params.role },
      {
        timestamps: { createdAt: false, updatedAt: true },
      },
      (err, data) => {
        if (err) {
          res.status(400).json({ err });
        } else {
          res.json({ success: true, message: "User main role added" });
        }
      }
    );
  }
);

router.put(
  "/addUserSubRoles/:id",
  userMiddleware.checkExistingUsername,
  userMiddleware.verifyToken,
  (req, res) => {
    let id = req.params.id;
    User.Auth.findOneAndUpdate(
      { _id: ObjectId(id) },
      { $addToSet: { secondaryRole: req.body.subroles } },
      {
        timestamps: { createdAt: false, updatedAt: true },
      },
      (err, data) => {
        if (err) {
          res.status(400).json({ err });
        } else {
          res.json({ success: true, message: "User sub roles added" });
        }
      }
    );
  }
);


module.exports = router;
