require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.rcnlifl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

let hotel_trans_bn;
let hotel_trans_en;
let hotels;
let experiences_trans_bn;
let experiences_trans_en;
let experiences;
let services_trans_bn;
let services_trans_en;
let services;

async function connectDB() {
	try {
		// await client.connect();
		const db = await client.db("airbnb");
		hotels = await db.collection("hotels");
		hotel_trans_en = await db.collection("hotel_trans_en");
		hotel_trans_bn = await db.collection("hotel_trans_bn");
		experiences = await db.collection("experiences");
		experiences_trans_en = await db.collection("experiences_trans_en");
		experiences_trans_bn = await db.collection("experiences_trans_bn");
		services = await db.collection("services");
		services_trans_en = await db.collection("services_trans_en");
		services_trans_bn = await db.collection("services_trans_bn");
		console.log("✅ Connected to MongoDB");

		// Test route
		app.get("/", (req, res) => {
			res.send("Server is running");
		});

		// Get hotels by division and language
		app.get("/hotels", async (req, res) => {
			try {
				const { division, language } = req.query;

				if (!division || !language) {
					return res
						.status(400)
						.json({ message: "division and language are required" });
				}

				// 1. Get listings for   the division
				const listings = await hotels.find({ division }).limit(8).toArray();

				const hotelsId = listings.map((l) => l._id);

				// 2. Get translations for those hotels
				let translations;
				if (language == "en") {
					translations = await hotel_trans_en
						.find({ listingId: { $in: hotelsId } })
						.toArray();
				} else if (language == "bn") {
					translations = await hotel_trans_bn
						.find({ listingId: { $in: hotelsId } })
						.toArray();
				}

				// 3. Merge hotels with translations
				const merged = listings.map((listing) => {
					const translation = translations.find((t) => t.listingId === listing._id);
					return {
						...listing,
						title: translation ? translation.title : listing.title,
						description: translation ? translation.description : listing.description,
					};
				});
				res.json(merged);
			} catch (err) {
				console.error(err);
				res.status(500).json({ message: "Internal server error" });
			}
		});

		//data for experience page

		app.get("/services", async (req, res) => {
			try {
				const { category, language, limit = 8 } = req.query;

				if (!category || !language) {
					return res
						.status(400)
						.json({ message: "division and language are required" });
				}

				// 1. Get listings for   the division
				const listings = await services.find({ category }).toArray();
				const servicesId = listings.map((l) => l._id);

				// 2. Get translations for those hotels
				let translations;
				if (language == "en") {
					translations = await services_trans_en
						.find({ listingId: { $in: servicesId } })
						.toArray();
				} else if (language == "bn") {
					translations = await services_trans_bn
						.find({ listingId: { $in: servicesId } })
						.toArray();
				}

				// 3. Merge hotels with translations
				const merged = listings.map((listing) => {
					const translation = translations.find((t) => t.listingId === listing._id);
					return {
						...listing,
						title: translation ? translation.title : listing.title,
						description: translation ? translation.description : listing.description,
					};
				});

				// 4. Shuffle merged array
				for (let i = merged.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[merged[i], merged[j]] = [merged[j], merged[i]];
				}
				res.json(merged);
			} catch (err) {
				console.error(err);
				res.status(500).json({ message: "Internal server error" });
			}
		});
		app.get("/experiences", async (req, res) => {
			try {
				const { division, language, limit = 8 } = req.query;

				if (!division || !language) {
					return res
						.status(400)
						.json({ message: "division and language are required" });
				}

				// 1. Get listings for   the division
				const listings = await experiences.find({ division }).toArray();

				const experiencesId = listings.map((l) => l._id);

				// 2. Get translations for those hotels
				let translations;
				if (language == "en") {
					translations = await experiences_trans_en
						.find({ listingId: { $in: experiencesId } })
						.toArray();
				} else if (language == "bn") {
					translations = await experiences_trans_bn
						.find({ listingId: { $in: experiencesId } })
						.toArray();
				}

				// 3. Merge hotels with translations
				const merged = listings.map((listing) => {
					const translation = translations.find((t) => t.listingId === listing._id);
					return {
						...listing,
						title: translation ? translation.title : listing.title,
						description: translation ? translation.description : listing.description,
					};
				});

				// 4. Shuffle merged array
				for (let i = merged.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[merged[i], merged[j]] = [merged[j], merged[i]];
				}
				res.json(merged);
			} catch (err) {
				console.error(err);
				res.status(500).json({ message: "Internal server error" });
			}
		});

		app.get("/search", async (req, res) => {
			try {
				const { route, category, language } = req.query;

				if (!route || !category || !language) {
					return res
						.status(400)
						.json({ message: "route, category and language are required" });
				}

				let listings = [];
				let translations = [];

				// 1️⃣ If services → filter by category
				if (route === "services") {
					listings = await services.find({ category }).toArray();
					const ids = listings.map((l) => l._id);

					if (language === "en") {
						translations = await services_trans_en
							.find({ listingId: { $in: ids } })
							.toArray();
					} else if (language === "bn") {
						translations = await services_trans_bn
							.find({ listingId: { $in: ids } })
							.toArray();
					}
				}

				// 2️⃣ If hotels or experiences → filter by division
				else if (route === "hotels" || route === "experiences") {
					const collection = route === "hotels" ? hotels : experiences;
					const trans_en =
						route === "hotels" ? hotel_trans_en : experiences_trans_en;
					const trans_bn =
						route === "hotels" ? hotel_trans_bn : experiences_trans_bn;

					listings = await collection.find({ division: category }).toArray();
					const ids = listings.map((l) => l._id);

					if (language === "en") {
						translations = await trans_en.find({ listingId: { $in: ids } }).toArray();
					} else if (language === "bn") {
						translations = await trans_bn.find({ listingId: { $in: ids } }).toArray();
					}
				}

				// 3️⃣ Merge listings with translations
				const merged = listings.map((listing) => {
					const translation = translations.find((t) =>
						t.listingId.equals(listing._id)
					);
					return {
						...listing,
						title: translation ? translation.title : listing.title,
						description: translation ? translation.description : listing.description,
					};
				});

				// 4️⃣ Shuffle results (optional)
				for (let i = merged.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[merged[i], merged[j]] = [merged[j], merged[i]];
				}

				res.json(merged);
			} catch (err) {
				console.error(err);
				res.status(500).json({ message: "Internal server error" });
			}
		});

		app.listen(PORT, () => {
			console.log(`🚀 Server running at http://localhost:${PORT}`);
		});
	} catch (err) {
		console.error("❌ MongoDB connection error:", err);
	}
}
connectDB();
