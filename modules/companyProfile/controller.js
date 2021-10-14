const express = require('express');

const CustomerProfile = require('./models');

const router = express.Router();

router.get('/', (req, res) => {
    CustomerProfile.find((err, data) => {
        if (err) {
            res.status(400).send(err.message);
        } else {
            res.status(200).json({
                success: true,
                data: data
            });
        }
    });
});


/* 
{
    "companyName": "zamzam", "website": "zamzam.com", "email": "swarup.saha@zamzam.com",
    "tagLine": "artwork", "phone": 9865321470, "fax": 9865321470, "gst": "27AASCS2460H1Z0",
    "award": "best seller", "certificate": "best seller", "metaTag": "zamzam Ecommerce",
    "metaKeyword": "zamzam Ecommerce", "metaData": "zamzam Ecommerce",
    "metaDescription": "zamzam Ecommerce", "logo": "zamzam.png", "favicon": "favicon.png",
    "primaryAddress": "#35,Shakuntala Nagar", "primaryCity": "Bangalore", "primaryPinCode": 560025,
    "primaryCountry": "India", "billingAddress": "#35,Shakuntala Nagar", "billingCity": "Bangalore",
    "billingPinCode": 560025, "billingCountry": "India", "establishedDate": "05/05/2021"
}
*/
router.post('/addCompanyProfile', (req, res) => {
    let model = new CustomerProfile(req.body);
    model.save((err, customer) => {
        if (err) {
            res.status(400).send(err.message);
        } else {
            res.status(200).json({
                success: true,
                message: 'Added Company Profile Data'
            });
        }
    });
});

module.exports = router;