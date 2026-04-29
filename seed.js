import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Helpers ───────────────────────────────────────────────────────────────────
const pick    = (arr)      => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = (arr)      => [...arr].sort(() => Math.random() - 0.5);

async function batchInsert(table, rows, size = 100) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + size));
    if (error) throw error;
  }
}

// ── Post content pool (80 unique posts across 8 topics) ──────────────────────
const POST_TEMPLATES = [
  // Tech & Dev
  "Just deployed my first React app to production. Seeing it live is something else entirely.",
  "Spent 3 hours debugging only to find a missing semicolon. Classic developer life.",
  "Learning TypeScript has been a game changer. Strongly typed code means fewer headaches at 2am.",
  "Switched from REST to GraphQL last week. I don't think I'm going back.",
  "Just published my first npm package. Six weeks of work, 47 lines of code.",
  "Hot take: clear variable names are worth more than any comment you could write.",
  "The best code is code you delete. Shipped a feature by removing 200 lines today.",
  "Open source saved me 40 hours this week. Remember to star the repos you actually use.",
  "Pair programming session today reminded me how much I learn from other developers.",
  "Docker containers are like self-contained universes. Still blows my mind every time.",
  "Finally got Vim bindings to feel natural. Only took six months of pure frustration.",
  "Code review culture at this job has doubled my skills in under a year.",
  "My terminal is my happy place. The command line never judges you.",
  "Three monitors later and I still find myself squinting at the laptop.",
  "Finished building a full-stack app from scratch over the weekend. The grind was real.",

  // Food & Cooking
  "Made homemade pasta for the first time tonight. I'm never buying store-bought again.",
  "Tried a new brunch spot downtown — the avocado toast is worth every penny of the hype.",
  "Meal prepped for the entire week on Sunday. Future me is incredibly grateful.",
  "Baked sourdough bread at home. It's science, it's art, and it's absolutely delicious.",
  "Street tacos at 2am after a concert are a completely different tier of food experience.",
  "Finally perfected my grandmother's biryani recipe. It took four attempts and was worth every one.",
  "Farmers market haul: fresh strawberries, basil, heirloom tomatoes. This is peak summer.",
  "Hot chocolate on a cold morning should be classified as therapy.",
  "Tried Ethiopian cuisine for the first time. Why did nobody tell me about injera sooner?",
  "Homemade pizza on Friday nights has become the ritual I didn't know I needed in my life.",
  "Made sushi at home for the first time. Harder than it looks but incredibly satisfying.",
  "Sunday morning pancakes with fresh blueberries. Simple things done well.",
  "Discovered a hole-in-the-wall pho place. Life will never be the same.",
  "Grilled peaches with honey and mascarpone for dessert. Summer is undefeated.",
  "Taught myself to make ramen from scratch. The broth takes 10 hours. 100% worth it.",

  // Fitness & Health
  "Hit a new PR at the gym — 225 lbs on the bench press. Six months of consistent training paying off.",
  "Morning runs are officially my therapy. 5 miles before sunrise and I feel invincible.",
  "Rest days are just as important as training days. Your body needs time to rebuild.",
  "One year of consistent gym visits. The mental benefits far outweigh the physical ones.",
  "Swimming laps this morning. There's something deeply meditative about being underwater.",
  "Started yoga six months ago as a joke. Now I'm the person who won't stop talking about it.",
  "Tracking sleep has been a revelation. Seven hours changes everything about how I function.",
  "Cycling to work for a month now. Better for the planet, better for my legs.",
  "Ran my first half marathon this morning. Three months ago I couldn't run a mile.",
  "Meal timing and hydration have made a bigger difference than any supplement I've tried.",
  "Cold showers every morning for 30 days. My energy levels have genuinely never been higher.",
  "Personal training session today. Having someone push you past your own limits is invaluable.",
  "Lost 20 lbs over the past year — no crash diet, just consistent small choices daily.",
  "Yoga and weightlifting together is the combination I didn't know I needed.",
  "Hit 10,000 steps every day this month. Small goal, big difference.",

  // Travel
  "Just landed in Tokyo and I'm already in love. The energy here is unlike anywhere I've been.",
  "Santorini sunsets deserve every single photograph ever taken of them.",
  "Solo travel teaches you things about yourself that nothing else can.",
  "Spent a week in Lisbon. The trams, the pastéis de nata, the fado music — perfect.",
  "Road tripping through the American Southwest. The scale of these landscapes is humbling.",
  "Hiking the Dolomites was the hardest and most beautiful thing I've ever done.",
  "Kyoto in autumn. The maple trees are just — I have no words for this.",
  "A week in Morocco. The colors, the spices, the architecture. My brain is still full.",
  "Took a spontaneous flight to Barcelona. Best impulsive decision I've made in years.",
  "Woke up early enough to catch the sunrise over the Grand Canyon. Completely alone up there.",
  "Bali for two weeks. Everything they say about it is true.",
  "Train travel through Europe should be everyone's rite of passage.",
  "Iceland in winter. The Northern Lights are something you cannot understand until you see them.",
  "Overnight ferry to the Greek islands. Woke up to the Aegean. Still processing.",
  "New Zealand road trip. Every single corner was a screensaver.",

  // Career & Growth
  "Five years ago I was working minimum wage. Today I got promoted to Senior Engineer. The grind is real.",
  "Gave my first conference talk today. Hands were shaking but I made it through.",
  "Negotiated a 20% raise today. Reminder: the worst they can say is no.",
  "Quit a job that was draining my soul. Terrifying. Also the best decision I've ever made.",
  "Mentoring a junior developer and realizing how much teaching reinforces your own learning.",
  "My career pivot at 35 was the scariest thing I ever attempted. Also the best.",
  "Set hard boundaries with work this year. I don't answer emails after 7pm. Thriving.",
  "Finished my MBA while working full-time. Two years of 5am mornings — every one worth it.",
  "Started freelancing on the side. First client signed. This is how it begins.",
  "Got rejected from my dream job in February. Just got hired there in November.",
  "Year one of running my own business. I've learned more than my entire career combined.",
  "Imposter syndrome hit hard this week. Then I looked at how far I've come. Keep going.",
  "Leadership is so much harder than it looks from the outside.",
  "Built something from nothing this quarter. The data validated everything we hoped for.",
  "Reading one industry book per month has quietly compounded into a huge advantage.",

  // Daily Life & Reflection
  "Coffee before anything else. That is my only non-negotiable rule in life.",
  "Cleaned out my closet and donated 40% of my clothes. Never felt lighter.",
  "Learned to say no to things that don't serve me. Life got noticeably better almost immediately.",
  "A good playlist can absolutely rescue a bad day. Never underestimate this.",
  "Turns out I just needed to go outside. Problem mostly solved.",
  "Woke up early enough to watch the sunrise. Why don't I do this every single day?",
  "Spent Sunday fully offline. Recharged in a way that genuinely surprised me.",
  "Wrote three pages in my journal for the first time in months. Highly recommend.",
  "My houseplants are thriving and honestly so am I.",
  "The library is criminally underrated as a productivity and focus space.",
  "Gratitude journal entry 365. One year of finding three things to be thankful for. It works.",
  "The people you surround yourself with define the life you live. Choose carefully.",
  "Comparison is the thief of joy. Staying in my own lane has made me genuinely happier.",
  "Every expert was once a beginner. Give yourself the grace to be one.",
  "Small consistent actions compound into extraordinary results over time. Trust the process.",
];

// ── Comment content pool ──────────────────────────────────────────────────────
const COMMENT_TEMPLATES = [
  "This is so relatable!",
  "Love this, thanks for sharing.",
  "Couldn't agree more.",
  "This made my whole day.",
  "Well said!",
  "I needed to read this today.",
  "Saving this post.",
  "This resonates with me so much.",
  "Keep it up!",
  "Facts.",
  "Literally me right now.",
  "This is everything.",
  "I felt this deeply.",
  "Wow, same here!",
  "You're doing amazing.",
  "How did you manage that?",
  "Tell me more!",
  "I've been thinking about this exact thing.",
  "This reminder was needed today.",
  "You inspire me.",
  "More of this, please.",
  "The best thing I've read all week.",
  "That's genuinely incredible.",
  "You make it look so easy.",
  "Sending good energy your way!",
  "Following for more of this.",
  "This is why I love seeing your posts.",
  "Absolutely this.",
  "Goals right here.",
  "So proud of you!",
  "This gave me courage to try.",
  "Couldn't have said it better myself.",
  "Sharing this immediately.",
  "Which one though?",
  "Where is this?!",
  "Recipe or it didn't happen.",
  "Big mood.",
  "You're honestly incredible.",
  "Underrated post right here.",
  "Real talk.",
  "This is the content I come here for.",
  "Teach me your ways.",
  "How long did this take?",
  "I needed this reminder.",
  "Cheering for you!",
];

// ── 50 User profiles (25 male, 25 female) ────────────────────────────────────
const USER_PROFILES = [
  // ── Male ──────────────────────────────────────────────────────────────────
  { first_name: "James",       last_name: "Smith",      gender: "Male",   birth_date: "1990-05-15", origin: "New York, USA",        current_location: "Los Angeles, USA",   marital_status: "Single",            education: "Bachelor's in Computer Science",          work: "Software Engineer"        },
  { first_name: "Robert",      last_name: "Johnson",    gender: "Male",   birth_date: "1985-08-22", origin: "Chicago, USA",         current_location: "San Francisco, USA", marital_status: "Married",           education: "Master's in Business Administration",     work: "Project Manager"          },
  { first_name: "Michael",     last_name: "Williams",   gender: "Male",   birth_date: "1992-03-10", origin: "Seattle, USA",         current_location: "Seattle, USA",       marital_status: "Single",            education: "Master's in Data Science",               work: "Data Scientist"           },
  { first_name: "William",     last_name: "Brown",      gender: "Male",   birth_date: "1988-11-30", origin: "Houston, USA",         current_location: "Dallas, USA",        marital_status: "Married",           education: "Bachelor's in Mechanical Engineering",    work: "Mechanical Engineer"      },
  { first_name: "David",       last_name: "Jones",      gender: "Male",   birth_date: "1995-06-18", origin: "Boston, USA",          current_location: "Boston, USA",        marital_status: "Single",            education: "Bachelor's in Finance",                  work: "Financial Analyst"        },
  { first_name: "Joseph",      last_name: "Garcia",     gender: "Male",   birth_date: "1987-09-25", origin: "Miami, USA",           current_location: "Miami, USA",         marital_status: "Divorced",          education: "Bachelor's in Marketing",                work: "Marketing Manager"        },
  { first_name: "Charles",     last_name: "Miller",     gender: "Male",   birth_date: "1983-04-12", origin: "Atlanta, USA",         current_location: "Nashville, USA",     marital_status: "Married",           education: "Bachelor's in Education",                work: "High School Teacher"      },
  { first_name: "Thomas",      last_name: "Davis",      gender: "Male",   birth_date: "1980-07-04", origin: "Denver, USA",          current_location: "Denver, USA",        marital_status: "Married",           education: "MD in Internal Medicine",                work: "Physician"                },
  { first_name: "Christopher", last_name: "Rodriguez",  gender: "Male",   birth_date: "1993-01-22", origin: "Portland, USA",        current_location: "Portland, USA",      marital_status: "In a relationship", education: "Bachelor's in Architecture",              work: "Architect"                },
  { first_name: "Daniel",      last_name: "Martinez",   gender: "Male",   birth_date: "1986-12-08", origin: "San Diego, USA",       current_location: "Los Angeles, USA",   marital_status: "Single",            education: "JD in Law",                              work: "Attorney"                 },
  { first_name: "Matthew",     last_name: "Hernandez",  gender: "Male",   birth_date: "1991-08-14", origin: "Austin, USA",          current_location: "Austin, USA",        marital_status: "In a relationship", education: "Bachelor's in Fine Arts",                work: "Photographer"             },
  { first_name: "Anthony",     last_name: "Lopez",      gender: "Male",   birth_date: "1989-05-03", origin: "New Orleans, USA",     current_location: "Nashville, USA",     marital_status: "Single",            education: "Culinary Arts Diploma",                  work: "Executive Chef"           },
  { first_name: "Mark",        last_name: "Wilson",     gender: "Male",   birth_date: "1984-02-19", origin: "Philadelphia, USA",    current_location: "New York, USA",      marital_status: "Divorced",          education: "Bachelor's in Journalism",               work: "Journalist"               },
  { first_name: "Steven",      last_name: "Anderson",   gender: "Male",   birth_date: "1990-10-31", origin: "Washington, DC, USA",  current_location: "Washington, DC, USA",marital_status: "Single",            education: "Master's in Cybersecurity",              work: "Cybersecurity Expert"     },
  { first_name: "Joshua",      last_name: "Thomas",     gender: "Male",   birth_date: "1996-07-07", origin: "Minneapolis, USA",     current_location: "Chicago, USA",       marital_status: "Single",            education: "Bachelor's in Graphic Design",           work: "Graphic Designer"         },
  { first_name: "Kevin",       last_name: "Taylor",     gender: "Male",   birth_date: "1988-03-23", origin: "Phoenix, USA",         current_location: "Phoenix, USA",       marital_status: "Married",           education: "Bachelor's in Nursing",                  work: "Registered Nurse"         },
  { first_name: "Brian",       last_name: "Moore",      gender: "Male",   birth_date: "1982-11-15", origin: "Detroit, USA",         current_location: "Detroit, USA",       marital_status: "Married",           education: "Bachelor's in Accounting",               work: "Senior Accountant"        },
  { first_name: "Timothy",     last_name: "Jackson",    gender: "Male",   birth_date: "1987-06-29", origin: "Las Vegas, USA",       current_location: "San Francisco, USA", marital_status: "Single",            education: "Bachelor's in Business Administration",  work: "Entrepreneur"             },
  { first_name: "Jason",       last_name: "Martin",     gender: "Male",   birth_date: "1993-09-11", origin: "Columbus, USA",        current_location: "Columbus, USA",      marital_status: "Married",           education: "Associate's in Criminal Justice",        work: "Police Officer"           },
  { first_name: "Ryan",        last_name: "Lee",        gender: "Male",   birth_date: "1994-04-17", origin: "San Jose, USA",        current_location: "San Francisco, USA", marital_status: "Single",            education: "Bachelor's in Interaction Design",       work: "UI/UX Designer"           },
  { first_name: "Jacob",       last_name: "Perez",      gender: "Male",   birth_date: "1991-12-05", origin: "Dallas, USA",          current_location: "Dallas, USA",        marital_status: "In a relationship", education: "Bachelor's in Civil Engineering",         work: "Civil Engineer"           },
  { first_name: "Gary",        last_name: "Thompson",   gender: "Male",   birth_date: "1979-08-08", origin: "Indianapolis, USA",    current_location: "Indianapolis, USA",  marital_status: "Married",           education: "Bachelor's in Sales Management",         work: "Sales Director"           },
  { first_name: "Nicholas",    last_name: "White",      gender: "Male",   birth_date: "1997-02-28", origin: "Sacramento, USA",      current_location: "Los Angeles, USA",   marital_status: "Single",            education: "Bachelor's in Film Production",          work: "Video Editor"             },
  { first_name: "Eric",        last_name: "Harris",     gender: "Male",   birth_date: "1986-10-20", origin: "Raleigh, USA",         current_location: "Raleigh, USA",       marital_status: "Married",           education: "PhD in Biochemistry",                    work: "Research Scientist"       },
  { first_name: "Jonathan",    last_name: "Sanchez",    gender: "Male",   birth_date: "1989-07-16", origin: "Tampa, USA",           current_location: "Tampa, USA",         marital_status: "Single",            education: "Bachelor's in Real Estate",              work: "Real Estate Agent"        },
  // ── Female ────────────────────────────────────────────────────────────────
  { first_name: "Mary",        last_name: "Clark",      gender: "Female", birth_date: "1988-05-10", origin: "New York, USA",        current_location: "New York, USA",      marital_status: "Single",            education: "PhD in Psychology",                      work: "Clinical Psychologist"    },
  { first_name: "Patricia",    last_name: "Ramirez",    gender: "Female", birth_date: "1984-09-17", origin: "Chicago, USA",         current_location: "Chicago, USA",       marital_status: "Married",           education: "Master's in Human Resources",            work: "HR Manager"               },
  { first_name: "Jennifer",    last_name: "Lewis",      gender: "Female", birth_date: "1991-03-29", origin: "Seattle, USA",         current_location: "Seattle, USA",       marital_status: "Single",            education: "Bachelor's in Nursing",                  work: "Registered Nurse"         },
  { first_name: "Linda",       last_name: "Robinson",   gender: "Female", birth_date: "1980-12-14", origin: "Houston, USA",         current_location: "Houston, USA",       marital_status: "Married",           education: "Master's in Education",                  work: "High School Teacher"      },
  { first_name: "Barbara",     last_name: "Walker",     gender: "Female", birth_date: "1986-07-22", origin: "Miami, USA",           current_location: "Miami, USA",         marital_status: "Divorced",          education: "Bachelor's in Interior Design",          work: "Interior Designer"        },
  { first_name: "Susan",       last_name: "Young",      gender: "Female", birth_date: "1985-04-01", origin: "Boston, USA",          current_location: "New York, USA",      marital_status: "Single",            education: "Master's in Journalism",                 work: "Senior Journalist"        },
  { first_name: "Jessica",     last_name: "Allen",      gender: "Female", birth_date: "1993-10-08", origin: "San Francisco, USA",   current_location: "San Francisco, USA", marital_status: "Single",            education: "Bachelor's in Software Engineering",     work: "Software Developer"       },
  { first_name: "Sarah",       last_name: "King",       gender: "Female", birth_date: "1981-06-30", origin: "Denver, USA",          current_location: "Denver, USA",        marital_status: "Married",           education: "MD in Pediatrics",                       work: "Pediatrician"             },
  { first_name: "Karen",       last_name: "Wright",     gender: "Female", birth_date: "1978-01-25", origin: "Portland, USA",        current_location: "Portland, USA",      marital_status: "Widowed",           education: "Master's in Finance",                    work: "Financial Advisor"        },
  { first_name: "Lisa",        last_name: "Scott",      gender: "Female", birth_date: "1990-08-13", origin: "Austin, USA",          current_location: "Austin, USA",        marital_status: "In a relationship", education: "Bachelor's in Communications",           work: "Marketing Specialist"     },
  { first_name: "Nancy",       last_name: "Torres",     gender: "Female", birth_date: "1987-11-04", origin: "Nashville, USA",       current_location: "Nashville, USA",     marital_status: "Married",           education: "Master's in Social Work",                work: "Social Worker"            },
  { first_name: "Betty",       last_name: "Nguyen",     gender: "Female", birth_date: "1983-03-18", origin: "Philadelphia, USA",    current_location: "Philadelphia, USA",  marital_status: "Married",           education: "PharmD",                                 work: "Pharmacist"               },
  { first_name: "Ashley",      last_name: "Hill",       gender: "Female", birth_date: "1994-09-27", origin: "Washington, DC, USA",  current_location: "New York, USA",      marital_status: "Single",            education: "Bachelor's in Graphic Arts",             work: "Art Director"             },
  { first_name: "Dorothy",     last_name: "Flores",     gender: "Female", birth_date: "1982-05-06", origin: "Minneapolis, USA",     current_location: "Minneapolis, USA",   marital_status: "Married",           education: "DDS in Dentistry",                       work: "Dentist"                  },
  { first_name: "Emily",       last_name: "Green",      gender: "Female", birth_date: "1996-02-14", origin: "Phoenix, USA",         current_location: "Los Angeles, USA",   marital_status: "Single",            education: "Bachelor's in Digital Media",            work: "Content Creator"          },
  { first_name: "Michelle",    last_name: "Adams",      gender: "Female", birth_date: "1989-12-20", origin: "Detroit, USA",         current_location: "Chicago, USA",       marital_status: "Single",            education: "Master's in Data Analytics",             work: "Data Analyst"             },
  { first_name: "Amanda",      last_name: "Nelson",     gender: "Female", birth_date: "1992-07-09", origin: "Las Vegas, USA",       current_location: "Las Vegas, USA",     marital_status: "In a relationship", education: "Bachelor's in Event Management",         work: "Event Planner"            },
  { first_name: "Melissa",     last_name: "Baker",      gender: "Female", birth_date: "1988-04-16", origin: "Columbus, USA",        current_location: "Columbus, USA",      marital_status: "Married",           education: "DVM in Veterinary Medicine",             work: "Veterinarian"             },
  { first_name: "Stephanie",   last_name: "Hall",       gender: "Female", birth_date: "1990-11-23", origin: "San Jose, USA",        current_location: "San Francisco, USA", marital_status: "Single",            education: "Bachelor's in Visual Arts",              work: "Creative Director"        },
  { first_name: "Rebecca",     last_name: "Rivera",     gender: "Female", birth_date: "1985-01-31", origin: "Dallas, USA",          current_location: "Dallas, USA",        marital_status: "Divorced",          education: "Master's in Environmental Science",      work: "Environmental Scientist"  },
  { first_name: "Sharon",      last_name: "Campbell",   gender: "Female", birth_date: "1981-08-07", origin: "Indianapolis, USA",    current_location: "Indianapolis, USA",  marital_status: "Married",           education: "DPT in Physical Therapy",                work: "Physical Therapist"       },
  { first_name: "Laura",       last_name: "Mitchell",   gender: "Female", birth_date: "1993-06-03", origin: "Sacramento, USA",      current_location: "New York, USA",      marital_status: "Single",            education: "Bachelor's in Fashion Design",           work: "Fashion Designer"         },
  { first_name: "Cynthia",     last_name: "Carter",     gender: "Female", birth_date: "1987-02-11", origin: "Raleigh, USA",         current_location: "Raleigh, USA",       marital_status: "Married",           education: "Master's in Biomedical Engineering",     work: "Biomedical Engineer"      },
  { first_name: "Kathleen",    last_name: "Roberts",    gender: "Female", birth_date: "1975-10-19", origin: "Tampa, USA",           current_location: "Tampa, USA",         marital_status: "Married",           education: "PhD in English Literature",              work: "University Professor"     },
  { first_name: "Amy",         last_name: "Gonzalez",   gender: "Female", birth_date: "1992-03-15", origin: "Austin, USA",          current_location: "Austin, USA",        marital_status: "Single",            education: "Bachelor's in Business Administration",  work: "Startup Founder"          },
];

// ── Main seeder ───────────────────────────────────────────────────────────────
async function seed() {
  // ── 1. Clear all existing data ──────────────────────────────────────────────
  console.log("Clearing existing data...");
  const NULL_UUID = "00000000-0000-0000-0000-000000000000";
  await supabase.from("comments").delete().neq("id", NULL_UUID);
  await supabase.from("post_likes").delete().neq("post_id", NULL_UUID);
  await supabase.from("follows").delete().neq("follower_id", NULL_UUID);
  await supabase.from("posts").delete().neq("id", NULL_UUID);
  await supabase.from("users").delete().neq("id", NULL_UUID);
  console.log("  ✓ Cleared");

  // ── 2. Users ────────────────────────────────────────────────────────────────
  console.log("\nSeeding 50 users...");
  const password = await bcrypt.hash("Password123!", 10);

  const userRows = USER_PROFILES.map((p) => ({
    first_name:       p.first_name,
    last_name:        p.last_name,
    username:         `${p.first_name}_${p.last_name}`.toLowerCase().replace(/\s+/g, "_"),
    email:            `${p.first_name}.${p.last_name}@example.com`.toLowerCase().replace(/\s+/g, ""),
    password,
    origin:           p.origin,
    current_location: p.current_location,
    birth_date:       p.birth_date,
    gender:           p.gender,
    marital_status:   p.marital_status,
    education:        p.education,
    work:             p.work,
    profile_picture:  "",
  }));

  const { data: users, error: usersError } = await supabase
    .from("users")
    .insert(userRows)
    .select();
  if (usersError) throw usersError;
  console.log(`  ✓ ${users.length} users`);

  // ── 3. Follows ──────────────────────────────────────────────────────────────
  console.log("\nSeeding follows...");
  const followPairs = new Set();
  const followRows  = [];

  for (const user of users) {
    const others = shuffle(users.filter((u) => u.id !== user.id));
    const count  = randInt(6, 14);
    for (let k = 0; k < count && k < others.length; k++) {
      const key = `${user.id}:${others[k].id}`;
      if (!followPairs.has(key)) {
        followPairs.add(key);
        followRows.push({ follower_id: user.id, following_id: others[k].id });
      }
    }
  }

  await batchInsert("follows", followRows);
  console.log(`  ✓ ${followRows.length} follows`);

  // ── 4. Posts ────────────────────────────────────────────────────────────────
  console.log("\nSeeding posts...");
  const postRows = [];

  for (const user of users) {
    const count = randInt(4, 7);
    for (let j = 0; j < count; j++) {
      // offset per user so every user gets a different slice of topics
      const idx = (postRows.length + j * 3) % POST_TEMPLATES.length;
      postRows.push({ content: POST_TEMPLATES[idx], author_id: user.id, image: "" });
    }
  }

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .insert(postRows)
    .select("id, author_id");
  if (postsError) throw postsError;
  console.log(`  ✓ ${posts.length} posts`);

  // ── 5. Likes ────────────────────────────────────────────────────────────────
  console.log("\nSeeding likes...");
  const likePairs = new Set();
  const likeRows  = [];

  for (const post of posts) {
    const likers = shuffle(users.filter((u) => u.id !== post.author_id));
    const count  = randInt(5, Math.min(20, likers.length));
    for (let k = 0; k < count; k++) {
      const key = `${post.id}:${likers[k].id}`;
      if (!likePairs.has(key)) {
        likePairs.add(key);
        likeRows.push({ post_id: post.id, user_id: likers[k].id });
      }
    }
  }

  await batchInsert("post_likes", likeRows);
  console.log(`  ✓ ${likeRows.length} likes`);

  // ── 6. Comments ─────────────────────────────────────────────────────────────
  console.log("\nSeeding comments...");
  const commentRows = [];

  for (const post of posts) {
    const commenters = shuffle(users.filter((u) => u.id !== post.author_id));
    const count      = randInt(2, 7);
    for (let k = 0; k < count && k < commenters.length; k++) {
      commentRows.push({
        post_id: post.id,
        user_id: commenters[k].id,
        content: pick(COMMENT_TEMPLATES),
      });
    }
  }

  await batchInsert("comments", commentRows);
  console.log(`  ✓ ${commentRows.length} comments`);

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────");
  console.log("  Seeding complete!");
  console.log(`  Users    : ${users.length}`);
  console.log(`  Follows  : ${followRows.length}`);
  console.log(`  Posts    : ${posts.length}`);
  console.log(`  Likes    : ${likeRows.length}`);
  console.log(`  Comments : ${commentRows.length}`);
  console.log(`  Total    : ${users.length + followRows.length + posts.length + likeRows.length + commentRows.length} records`);
  console.log("─────────────────────────────");

  process.exit(0);
}

seed().catch((err) => {
  console.error("\nSeeding failed:", err.message ?? err);
  process.exit(1);
});
