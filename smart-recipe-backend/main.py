import os
from typing import List, Optional
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from bson import ObjectId 

# 1. Load environment variables and define constants
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

# 2. Initialize FastAPI app
app = FastAPI(title="Smart Recipe Generator API")

# --- CONFIGURE CORS MIDDLEWARE (FINAL DEPLOYMENT FIX) ---
origins = [
    # Local Development Origins
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    
    # Render and Vercel Live Deployment Origins
    "https://smart-recipe-generator-bay.vercel.app", 
    "https://smart-recipe-generator-bay.vercel.app/",
    "https://smartrecipegenerator-kn6d.onrender.com",
    "https://smartrecipegenerator-kn6d.onrender.com/",
    "https://smart-recipe-generator-bay.vercel.app", # Final Vercel URL (based on your logs)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ------------------------------------------------------------------

# 3. MongoDB connection variables
app.mongodb_client = None
app.mongodb = None


@app.on_event("startup")
async def startup_db_client():
    if MONGO_URI is None:
        raise EnvironmentError("MONGO_URI is not set in the environment variables.")

    try:
        app.mongodb_client = AsyncIOMotorClient(MONGO_URI)
        # Assuming the database name is SmartRecipeDB
        app.mongodb = app.mongodb_client.get_database("SmartRecipeDB") 
        print("Successfully connected to MongoDB Atlas.")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    if app.mongodb_client:
        app.mongodb_client.close()
        print("MongoDB connection closed.")


@app.get("/")
async def root():
    return {"message": "Smart Recipe Generator API is running."}


# --- ROUTE: GET ALL CANONICAL INGREDIENTS ---

@app.get("/api/ingredients", response_model=List[str])
async def get_canonical_ingredients():
    if app.mongodb is None:
        raise HTTPException(status_code=503, detail="Database connection not initialized.")

    try:
        pipeline = [
            {"$unwind": "$ingredients"},
            {"$group": {"_id": "$ingredients.canonicalName"}},
            {"$sort": {"_id": 1}},
            {"$project": {"_id": 0, "canonicalName": "$_id"}}
        ]
        
        cursor = app.mongodb["recipes"].aggregate(pipeline)
        unique_ingredients = [doc["canonicalName"] for doc in await cursor.to_list(None)]
        
        return unique_ingredients
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# --- ROUTE: ADVANCED RECIPE SEARCH MODELS AND ROUTE ---

class RecipeSearchQuery(BaseModel):
    """Model for user input (ingredients, filters)."""
    ingredients: List[str] = Field(default=[], description="Canonical names of available ingredients.")
    max_cooking_time: Optional[int] = None
    required_cuisine: Optional[str] = None
    is_vegetarian: Optional[bool] = None
    is_gluten_free: Optional[bool] = None

class RateInput(BaseModel):
    """Model for accepting a user rating."""
    user_id: str = Field(..., description="Unique ID of the user submitting the rating.")
    rating: int = Field(..., ge=1, le=5, description="The user's rating (1 to 5).")

@app.post("/api/recipes/search")
async def search_recipes(query: RecipeSearchQuery):
    if app.mongodb is None:
        raise HTTPException(status_code=503, detail="Database connection not initialized.")

    mongo_filter = {}
    if query.is_vegetarian is True:
        mongo_filter["filters.isVegetarian"] = True
    if query.is_gluten_free is True:
        mongo_filter["filters.isGlutenFree"] = True
    if query.max_cooking_time is not None:
        mongo_filter["filters.cookingTimeMinutes"] = {"$lte": query.max_cooking_time}
    if query.required_cuisine:
        mongo_filter["filters.cuisine"] = query.required_cuisine

    if query.ingredients:
        mongo_filter["ingredients.canonicalName"] = {"$in": query.ingredients}
    elif not any([query.max_cooking_time, query.required_cuisine, query.is_vegetarian, query.is_gluten_free]):
         return {"results": []}

    try:
        recipes_cursor = app.mongodb["recipes"].find(mongo_filter)
        recipes = await recipes_cursor.to_list(None)
        
        user_ingredients_set = set(query.ingredients)
        scored_recipes = []

        for recipe in recipes:
            recipe["_id"] = str(recipe["_id"]) 

            recipe_ingredients_set = set(item['canonicalName'] for item in recipe['ingredients'])
            
            matched_ingredients = recipe_ingredients_set.intersection(user_ingredients_set)
            missing_ingredients = recipe_ingredients_set.difference(user_ingredients_set)
            total_recipe_ingredients = len(recipe_ingredients_set)
            
            if total_recipe_ingredients == 0:
                score = 0
            else:
                coverage_score = len(matched_ingredients) / total_recipe_ingredients
                score = (coverage_score * 0.8) + (recipe.get('averageRating', 0) / 5 * 0.2)

            substitutions = {}
            for missing_item in missing_ingredients:
                if missing_item in recipe.get('substitutionSuggestions', {}):
                    substitutions[missing_item] = recipe['substitutionSuggestions'][missing_item]

            recipe['coverageScore'] = round(score, 4)
            recipe['missingIngredients'] = list(missing_ingredients)
            recipe['substitutions'] = substitutions
            
            if len(matched_ingredients) > 0 or not query.ingredients:
                scored_recipes.append(recipe)

        final_results = sorted(scored_recipes, key=lambda x: x['coverageScore'], reverse=True)

        return {"results": final_results[:10]}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed due to internal server error: {str(e)}")


# --- ROUTE: USER FEEDBACK (SAVE FAVORITE) ---

@app.post("/api/recipes/{recipe_id}/favorite")
async def save_favorite(recipe_id: str, user_id: str = Body(..., embed=True)):
    if app.mongodb is None:
        raise HTTPException(status_code=503, detail="Database connection not initialized.")
    
    try:
        ObjectId(recipe_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid recipe ID format.")

    favorite_doc = {
        "user_id": user_id, 
        "recipe_id": recipe_id, 
        "timestamp": datetime.now(),
    }
    
    try:
        existing = await app.mongodb["favorites"].find_one({"user_id": user_id, "recipe_id": recipe_id})
        
        if existing:
            return {"message": "Recipe is already a favorite.", "saved": False}

        await app.mongodb["favorites"].insert_one(favorite_doc)
        return {"message": "Recipe saved successfully.", "saved": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save favorite: {str(e)}")


# --- ROUTE: USER FEEDBACK (RATE RECIPE) ---

@app.post("/api/recipes/{recipe_id}/rate")
async def rate_recipe(recipe_id: str, data: RateInput):
    if app.mongodb is None:
        raise HTTPException(status_code=503, detail="Database connection not initialized.")

    try:
        recipe_obj_id = ObjectId(recipe_id)
        
        # 1. Store the new rating under the dynamic user ID
        rating_key = f"ratings.{data.user_id}" 
        await app.mongodb["recipes"].update_one(
            {"_id": recipe_obj_id},
            {"$set": {rating_key: data.rating}}
        )

        # 2. Recalculate the overall average rating
        recipe = await app.mongodb["recipes"].find_one({"_id": recipe_obj_id})
        
        if recipe and 'ratings' in recipe:
            all_ratings = list(recipe['ratings'].values())
            
            new_average = sum(all_ratings) / len(all_ratings)
            
            # 3. Update the recipe's master averageRating field
            await app.mongodb["recipes"].update_one(
                {"_id": recipe_obj_id},
                {"$set": {"averageRating": round(new_average, 1)}}
            )

        return {"message": "Rating submitted successfully.", "new_rating": data.rating}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rating submission failed: {str(e)}")


# --- NEW ROUTE: FETCH USER HISTORY (FOR FRONTEND PERSISTENCE) ---
@app.get("/api/user/{user_id}/history")
async def get_user_history(user_id: str):
    """
    Fetches the user's favorite list to populate UI state upon refresh.
    """
    if app.mongodb is None:
        raise HTTPException(status_code=503, detail="Database connection not initialized.")

    try:
        # Get favorite IDs
        favorite_list = await app.mongodb["favorites"].find({"user_id": user_id}).to_list(None)
        favorite_ids = [fav['recipe_id'] for fav in favorite_list]
        
        return {"favorites": favorite_ids}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"History fetch failed: {str(e)}")


# --- ROUTE: RECIPE SUGGESTIONS (Recommendation System) ---

@app.get("/api/user/{user_id}/suggestions")
async def get_user_suggestions(user_id: str):
    if app.mongodb is None:
        raise HTTPException(status_code=503, detail="Database connection not initialized.")

    try:
        favorite_list = await app.mongodb["favorites"].find({"user_id": user_id}).to_list(None)
        
        if not favorite_list:
            # Fallback: show the top 5 highest-rated recipes
            random_cursor = app.mongodb["recipes"].find().sort("averageRating", -1).limit(5)
            suggestions = await random_cursor.to_list(None)
            for recipe in suggestions:
                recipe["_id"] = str(recipe["_id"])
            
            return {"message": "No favorites yet. Showing popular recipes.", "results": suggestions}

        favorite_ids = [fav['recipe_id'] for fav in favorite_list]
        favorite_obj_ids = []
        
        for id_str in favorite_ids:
            try:
                favorite_obj_ids.append(ObjectId(id_str))
            except Exception:
                continue
        
        if not favorite_obj_ids:
            return {"message": "Could not find valid favorites for suggestions.", "results": []}

        favorite_recipes = await app.mongodb["recipes"].find({"_id": {"$in": favorite_obj_ids}}).to_list(None)

        preferred_cuisines = set(r['filters']['cuisine'] for r in favorite_recipes if r.get('filters', {}).get('cuisine'))
        
        if not preferred_cuisines:
             return {"message": "Showing popular recipes (filter fallback).", "results": []}

        suggestion_filter = {
            "filters.cuisine": {"$in": list(preferred_cuisines)},
        }

        suggestions_cursor = app.mongodb["recipes"].find(suggestion_filter).sort("averageRating", -1).limit(5)
        suggestions = await suggestions_cursor.to_list(None)

        for recipe in suggestions:
            recipe["_id"] = str(recipe["_id"])
            
        return {"message": f"Suggestions based on saved cuisines: {', '.join(preferred_cuisines)}", "results": suggestions}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Suggestion failed: {str(e)}")
