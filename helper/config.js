const config = {
    secrateKey: process.env.secrateKey,
	refreshSecrateKey: process.env.refreshSecrateKey,

	emailID: process.env.EMAIL_ID,
	emailPassword: process.env.EMAIL_PASSWORD,
	emailHost: process.env.EMAIL_HOST,

	AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
	AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
	REGION : process.env.REGION,
	Bucket: process.env.Bucket
}

module.exports = config;