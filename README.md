
# 🧑‍🍳 Smart Recipe Generator

This project is a full-stack application developed as a technical assessment for a Software Engineer position. It provides a dynamic recipe suggestion engine based on user-provided ingredients, featuring custom matching algorithms and a personalized recommendation system.

## 🔗 Live Application & Repository Structure

| Component | Status | URL |
| :--- | :--- | :--- |
| **Live Frontend (Vercel)** | **Deployed** | **[INSERT VERCEL APPLICATION URL HERE]** |
| **Live Backend API (Render)** | **Deployed** | **[INSERT RENDER API URL HERE]** |
| **GitHub Repository** | **Final Code** | `https://github.com/susa0676/SmartRecipeGenerator` |

### Repository Structure

```
SmartRecipeGenerator/
├── smart-recipe-backend/       <-- Python FastAPI API (main.py, requirements.txt)
├── smart-recipe-frontend/      <-- Next.js/TypeScript Frontend (src/app/page.tsx)
│   └── public/images/          <-- Stores all static recipe and ingredient visuals
└── README.md
```

-----

## 💡 Technical Approach & Logic Summary

| Evaluation Criteria | Implementation Detail |
| :--- | :--- |
| **Ingredient Input** | Satisfied by implementing both **Visual Selection** (image-backed chips) and a **Text Input Field**. Inputs are canonicalized in the frontend. |
| **Recipe Matching Logic** | The core search logic uses a **Weighted Coverage Score**: results are ranked based on (80% Ingredient Coverage) + (20% Average Rating) to prioritize recipes the user can fully make. |
| **Substitution Suggestions** | Implemented: The backend identifies missing ingredients and returns pre-defined substitutes, which are highlighted on the recipe card. |
| **User Feedback / Suggestions** | **Satisfied:** The system tracks user **Favorites** and **Ratings** via dynamic API endpoints, powering a **Content-Based Recommendation** engine that suggests recipes matching the user's preferred cuisine. |
| **Technical Stack** | **Frontend:** Next.js (TypeScript) + Tailwind CSS. **Backend:** FastAPI (Python) + MongoDB Atlas. This architecture is fully decoupled and deployed on Vercel/Render. |
| **Error Handling** | Implemented **CORS Middleware** (to ensure Vercel and Render communicate) and robust client-side loading states (`isSearching`) for better UX. |

-----

## 📋 Final Write-up (200 words max)

My approach was to implement a robust, decoupled **Full-Stack Architecture** using Next.js/TypeScript for a responsive frontend and Python/FastAPI for the high-performance backend logic, all hosted on the free tier of Vercel and Render.

The **Recipe Matching Logic** uses a backend scoring algorithm: it first filters by **Dietary Restrictions** and then ranks results using a weighted score combining **Ingredient Coverage (80%)** and **Average Rating (20%)**. This ensures suggestions prioritize recipes the user can actually make. **Substitution Suggestions** are provided for missing items.

The **User Feedback** system leverages a dynamic mock-user ID to track **Favorites** and **Ratings** stored in MongoDB. The **"Recipe Suggestions"** feature is implemented via a **Content-Based Recommendation** model that queries for recipes sharing the cuisine preferences of the user’s highest-rated items.

Key technical achievements include resolving complex cross-language deployment conflicts (MongoDB/Python compatibility) during setup, implementing **Visual Ingredient Selection**, and ensuring a **Type-Safe** (TypeScript) and **Mobile-Responsive** interface with robust state synchronization for optimal UX.

-----

**(Word count: 153)**

-----
