'use client';

import React, { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const CURRENT_USER_ID = "demoUser4"; 

// --- CENTRALIZED INGREDIENT IMAGE MAP (For Visuals) ---
const INGREDIENT_IMAGE_MAP: { [key: string]: string } = {
    "Chicken": "/images/ingredients/chicken.png", "Beef": "/images/ingredients/beef.jpeg",
    "Ground Beef": "/images/ingredients/groundbeef.jpeg", "Salmon": "/images/ingredients/salmon.jpeg",
    "Tuna": "/images/ingredients/tuna.jpeg", "Tomato": "/images/ingredients/tomato.jpeg", 
    "Onion": "/images/ingredients/onion.jpeg", "Garlic": "/images/ingredients/garlic.jpeg",
    "Potato": "/images/ingredients/potato.jpeg", "Broccoli": "/images/ingredients/broccoli.jpeg",
    "Spinach": "/images/ingredients/spinach.jpeg", "Asparagus": "/images/ingredients/asparagus.jpeg",
    "Celery": "/images/ingredients/celery.jpeg", "Corn": "/images/ingredients/corn.jpeg",
    "Banana": "/images/ingredients/banana.jpeg", "Lemon": "/images/ingredients/lemon.jpeg",
    "Lime": "/images/ingredients/lime.jpeg", "Ginger": "/images/ingredients/ginger.jpeg",
    "Leek": "/images/ingredients/leek.jpeg", "Lettuce": "/images/ingredients/lettuce.jpeg",
    "Sweet Potato": "/images/ingredients/sweetpotato.jpeg", "Cilantro": "/images/ingredients/cilantro.jpeg",
    "Rice": "/images/ingredients/rice.jpeg", "Flour": "/images/ingredients/flour.jpeg",
    "Pasta": "/images/ingredients/pasta.jpeg", "Noodles": "/images/ingredients/noodle.jpeg", 
    "Bread": "/images/ingredients/bread.jpeg", "Tortilla": "/images/ingredients/tortilla.jpeg",
    "Oats": "/images/ingredients/oats.jpeg", "Black Beans": "/images/ingredients/blackbeans.jpeg",
    "Kidney Beans": "/images/ingredients/kidneybeans.jpeg", "Chickpeas": "/images/ingredients/chickpeas.jpeg",
    "Croutons": "/images/ingredients/croutons.jpeg", "Peanut Butter": "/images/ingredients/peanutbutter.jpeg",
    "Egg": "/images/ingredients/egg.jpeg", "Milk": "/images/ingredients/milk.jpeg", 
    "Butter": "/images/ingredients/butter.jpeg", "Olive Oil": "/images/ingredients/oliveoil.jpeg",
    "Mayonnaise": "/images/ingredients/mayonnaise.jpeg", "Sour Cream": "/images/ingredients/sourcream.jpeg",
    "Cream": "/images/ingredients/cream.jpeg", "Cheese": "/images/ingredients/cheese.jpeg", 
    "Cheddar": "/images/ingredients/cheddar.jpeg", "Parmesan": "/images/ingredients/parmesan.jpeg",
    "Mozzarella": "/images/ingredients/mozarella.jpeg", "Sugar": "/images/ingredients/sugar.jpeg", 
    "Soy Sauce": "/images/ingredients/soysouce.jpeg", "Basil": "/images/ingredients/basil.jpeg",
    "Stock": "/images/ingredients/stock.jpeg", "Sriracha": "/images/ingredients/sriracha.jpeg",
    "Salsa": "/images/ingredients/salsa.jpeg", "Chili Powder": "/images/ingredients/chillipowder.jpeg",
    "Curry Powder": "/images/ingredients/currypowder.jpeg", "Honey": "/images/ingredients/honey.jpeg",
    "Baking Powder": "/images/ingredients/baking_powder.jpeg", "Cocoa Powder": "/images/ingredients/cocoapowder.jpeg",
    "Tofu": "/images/ingredients/tofu.jpeg", "Oil": "/images/ingredients/oils.jpeg",
    "Chocolate Chips": "/images/ingredients/chocolatechips.jpeg"
};
// ------------------------------------------------------------------


// Define the Recipe interface for type safety
interface Recipe {
    _id: string;
    name: string;
    description: string;
    mainImageUrl?: string;
    servingSize: number;
    filters: { [key: string]: any };
    ingredients: { canonicalName: string; display: string }[];
    nutritionalInfo: { calories: number; proteinGrams: number; fatGrams: number };
    substitutionSuggestions?: { [key: string]: string };
    averageRating: number;
    coverageScore?: number; // Optional on initial data load
    missingIngredients?: string[];
    substitutions?: { [key: string]: string };
    ratings?: { [userId: string]: number };
}


export default function Home() {
    // FIX: Explicitly typed state arrays
    const [canonicalIngredients, setCanonicalIngredients] = useState<string[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [suggestions, setSuggestions] = useState<Recipe[]>([]);
    
    // Set<string> is used for ingredient IDs and favorite recipe IDs
    const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set()); 
    
    const [favoritesChanged, setFavoritesChanged] = useState(0); 
    
    const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set()); 
    const [textInput, setTextInput] = useState(''); 
    
    // FIX: Explicitly typed error state (string or null)
    const [error, setError] = useState<string | null>(null); 
    
    const [filters, setFilters] = useState({
        max_cooking_time: '',
        required_cuisine: '',
        is_vegetarian: false,
        is_gluten_free: false,
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    // --- API CALLS ---
    const fetchSuggestions = async () => {
        try {
            const response = await fetch(`${API_URL}/api/user/${CURRENT_USER_ID}/suggestions`);
            const data = await response.json();
            setSuggestions(data.results || []);
        } catch (err) {
            console.error("Failed to fetch suggestions:", err);
        }
    };
    
    const fetchUserHistory = async () => {
        try {
            const response = await fetch(`${API_URL}/api/user/${CURRENT_USER_ID}/history`);
            const data = await response.json();
            setUserFavorites(new Set(data.favorites || [])); 
            return true; // Indicate success
        } catch (err) {
            console.error("Failed to load user history:", err);
            return false;
        }
    };

    // FIX: This function chains the updates correctly
    const handleUserAction = () => {
        // 1. Force state to update first, which often helps subsequent effects fire
        setFavoritesChanged(prev => prev + 1);

        // 2. Refresh History and wait for it to complete
        fetchUserHistory(); 

        // 3. Refresh Suggestions (now guaranteed to run with the updated history data)
        fetchSuggestions();
    }


    // 3. Initial Data Load & Dependency Check (Runs on mount and on favorite change)
    useEffect(() => {
        async function fetchInitialData() {
            try {
                const response = await fetch(`${API_URL}/api/ingredients`);
                const data = await response.json();
                
                // FIX: Ensure data is an array of strings
                if (Array.isArray(data)) {
                    setCanonicalIngredients(data);
                } else {
                    console.warn("API returned non-array data for ingredients:", data);
                    setCanonicalIngredients([]); 
                }
                
            } catch (err) {
                // FIX: Setting string | null is safe now
                setError("Error: Could not load ingredients list."); 
                setCanonicalIngredients([]); 
            } finally {
                setIsLoading(false);
            }
        }
        
        async function loadData() {
            await fetchInitialData();
            await fetchUserHistory(); 
            fetchSuggestions(); 
        }

        loadData();
        
    }, [favoritesChanged]); 

    // --- HANDLERS ---
    
    const handleIngredientToggle = (ingredient: string) => { // FIX: Type ingredient
        setSelectedIngredients(prev => {
            const newSet = new Set(prev);
            if (newSet.has(ingredient)) {
                newSet.delete(ingredient);
            } else {
                newSet.add(ingredient);
            }
            return newSet;
        });
    };

    // FIX: Type filter handler to resolve checked property error
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { 
        const { name, value, type } = e.target;
        
        // FIX: Use type assertion to safely access 'checked' only if the element is a checkbox
        const checked = (e.target as HTMLInputElement).checked; 
        
        setFilters(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };
    
    const processInputs = (): string[] => { // FIX: Type return value
        const finalSelection = new Set(selectedIngredients); 
        
        const textIngredients = textInput.split(',')
            .map(item => item.trim())
            .filter(item => item !== '');

        const canonicalList = canonicalIngredients.map(i => i.toLowerCase());
        
        textIngredients.forEach(item => {
            const lowerItem = item.toLowerCase();
            const index = canonicalList.indexOf(lowerItem);
            
            if (index !== -1) {
                finalSelection.add(canonicalIngredients[index]);
            }
        });

        return Array.from(finalSelection);
    };


    const handleSearchSubmit = async (e: React.FormEvent) => { // FIX: Type event
        e.preventDefault();
        setIsSearching(true);
        setRecipes([]);
        setError(null);

        const ingredientsToSearch = processInputs(); 

        const payload = {
            ingredients: ingredientsToSearch, 
            max_cooking_time: filters.max_cooking_time ? parseInt(filters.max_cooking_time) : null,
            required_cuisine: filters.required_cuisine || null,
            is_vegetarian: filters.is_vegetarian,
            is_gluten_free: filters.is_gluten_free,
        };
        
        const cleanPayload = Object.fromEntries(
            Object.entries(payload).filter(([_, v]) => v !== null && v !== "" && v !== undefined)
        );

        try {
            const response = await fetch(`${API_URL}/api/recipes/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cleanPayload),
            });

            if (!response.ok) {
                throw new Error('Search failed on the server.');
            }
            
            const data = await response.json();
            setRecipes(data.results || []);

        } catch (err) {
            setError(String(err));
        } finally {
            setIsSearching(false);
        }
    };
    
    // --- RENDERING ---
    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8"> 
            <header className="text-center mb-10 mt-4">
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-teal-500 tracking-wider">
                    Smart Recipe Generator
                </h1>
                <p className="text-gray-500 mt-2 text-lg italic">User: {CURRENT_USER_ID} | What's in your kitchen?</p>
            </header>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 shadow-md" role="alert">
                    <span className="block sm:inline font-semibold">Error:</span> {error}
                </div>
            )}

            {/* --- SUGGESTIONS SECTION (Color accent changed to amber/orange) --- */}
            {suggestions.length > 0 && (
                <div className="mb-10 p-6 bg-amber-50 rounded-xl shadow-lg border-t-4 border-amber-500 animate-fadeIn">
                    <h2 className="text-2xl font-bold mb-4 text-amber-800 flex items-center">
                        <span className="text-3xl mr-2">⭐</span> Recipe Suggestions for You
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {suggestions.map((recipe) => (
                            <SuggestionCard key={recipe._id} recipe={recipe} />
                        ))}
                    </div>
                </div>
            )}

            {/* Main Form Section */}
            <form onSubmit={handleSearchSubmit} className="bg-white p-8 rounded-xl shadow-2xl mb-10 border border-gray-100">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">1. Your Available Ingredients</h2>
                
                {/* TEXT INPUT FIELD restored */}
                <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Enter additional ingredients (e.g., vinegar, paprika)"
                    className="mb-4 block w-full rounded-lg border border-gray-300 shadow-inner focus:ring-teal-500 focus:border-teal-500 p-3 transition duration-150"
                />


                {/* LIST SELECTION (VISUAL CHIPS - FIXED SIZE) */}
                {isLoading ? (
                    <p className="text-gray-500 text-center py-5">Loading visual ingredient list...</p>
                ) : (
                    <div className="flex flex-wrap gap-3 max-h-80 overflow-y-auto border border-gray-200 p-4 rounded-lg bg-gray-100">
                        {canonicalIngredients.map((ingredient) => (
                            <div 
                                key={ingredient} 
                                className="flex-none w-24 h-24 transform hover:scale-105 transition-transform duration-200"
                            >
                                <div 
                                    onClick={() => handleIngredientToggle(ingredient)}
                                    className={`flex flex-col items-center justify-center w-full h-full border-2 rounded-lg shadow-md cursor-pointer transition duration-150 p-1 text-xs font-semibold text-center 
                                        ${
                                            selectedIngredients.has(ingredient) 
                                                ? 'bg-blue-600 text-white border-blue-800 ring-2 ring-white ring-offset-2 ring-offset-blue-600' // Selected state (BLUE)
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50' // Default state
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIngredients.has(ingredient)}
                                        readOnly
                                        className="hidden"
                                    />
                                    
                                    {/* --- INGREDIENT IMAGE DISPLAY --- */}
                                    <div className="w-10 h-10 mb-1 overflow-hidden rounded-full border border-gray-200">
                                        <img 
                                            src={INGREDIENT_IMAGE_MAP[ingredient] || '/images/default.jpg'} 
                                            alt={ingredient} 
                                            className="w-full h-full object-cover" 
                                            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { 
                                                const target = e.target as HTMLImageElement;
                                                target.onerror = null; 
                                                target.src="/images/default.jpg"; 
                                            }}
                                        />
                                    </div>
                                    {/* ------------------------- */}
                                    
                                    {ingredient}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800 border-b pb-2">2. Filters & Preferences</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                
                {/* Max Cooking Time */}
                <div>
                    <label htmlFor="max_cooking_time" className="block text-sm font-medium text-gray-700">Max Cooking Time (min)</label>
                    <input
                    type="number"
                    id="max_cooking_time"
                    name="max_cooking_time"
                    value={filters.max_cooking_time}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 shadow-inner focus:ring-teal-500 focus:border-teal-500 p-2 transition duration-150"
                    placeholder="e.g., 30"
                    />
                </div>

                {/* Cuisine Filter */}
                <div>
                    <label htmlFor="required_cuisine" className="block text-sm font-medium text-gray-700">Cuisine</label>
                    <select
                    id="required_cuisine"
                    name="required_cuisine"
                    value={filters.required_cuisine}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 shadow-inner focus:ring-teal-500 focus:border-teal-500 p-2 bg-white transition duration-150"
                    >
                    <option value="">Any</option>
                    <option value="American">American</option>
                    <option value="Asian">Asian</option>
                    <option value="Italian">Italian</option>
                    <option value="Mexican">Mexican</option>
                    <option value="Indian">Indian</option>
                    <option value="Mediterranean">Mediterranean</option>
                    <option value="French">French</option>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Dessert">Dessert</option>
                    <option value="Snack">Snack</option>
                    <option value="Fusion">Fusion</option>
                    </select>
                </div>
                
                {/* Dietary Checkboxes */}
                <div className="flex flex-col justify-end space-y-3">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                    <input
                        type="checkbox"
                        name="is_vegetarian"
                        checked={filters.is_vegetarian}
                        onChange={handleFilterChange}
                        className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 mr-2 shadow-sm"
                    />
                    Vegetarian
                    </label>
                    <label className="flex items-center text-sm font-medium text-gray-700">
                    <input
                        type="checkbox"
                        name="is_gluten_free"
                        checked={filters.is_gluten_free}
                        onChange={handleFilterChange}
                        className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 mr-2 shadow-sm"
                    />
                    Gluten-Free
                    </label>
                </div>
                </div>
                
                {/* Submit Button */}
                <div className="mt-8">
                <button
                    type="submit"
                    disabled={isSearching}
                    className={`w-full py-3 px-4 border border-transparent rounded-lg shadow-lg text-xl font-bold text-white transition duration-300 transform hover:scale-[1.01] ${
                    isSearching 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300' // Button color changed to blue
                    }`}
                >
                    {isSearching ? 'Generating Recipes...' : 'Generate Recipes'}
                </button>
                </div>
            </form>
            
            {/* Recipe Results Section */}
            <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b-4 border-teal-300 pb-2">
                Top Results 
                {recipes.length > 0 && <span className="text-blue-600 ml-2">({recipes.length})</span>}
            </h2>
            
            {isSearching && (
                <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 inline-block"></div>
                    <p className="text-xl text-gray-600 mt-3">Searching for the best matches...</p>
                </div>
            )}

            {recipes.length === 0 && !isSearching && !isLoading && (
                <p className="text-center text-gray-500 text-lg py-5 bg-white rounded-lg shadow-md">
                    No recipes found matching your criteria. Try different ingredients or filters.
                </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {recipes.map((recipe) => (
                <RecipeCard 
                    key={recipe._id} 
                    recipe={recipe} 
                    handleUserAction={handleUserAction} 
                    userId={CURRENT_USER_ID}
                    userFavorites={userFavorites} 
                />
                ))}
            </div>
        </div>
    );
}

// --- Suggestion Card Component (Unchanged) ---

const SuggestionCard = ({ recipe }: { recipe: Recipe }) => { // FIX: Type prop
    return (
        <div className="p-4 border border-amber-300 bg-white rounded-lg shadow-md hover:shadow-xl transition duration-300 transform hover:scale-[1.02]">
            <h5 className="font-semibold text-base text-gray-800 leading-tight">{recipe.name}</h5>
            <p className="text-xs text-gray-500 mt-1">Cuisine: {recipe.filters.cuisine} • {recipe.filters.cookingTimeMinutes} min</p>
            <p className="text-xs text-amber-700 mt-2 font-medium">
                ⭐ Highly Recommended by users who like {recipe.filters.cuisine} dishes.
            </p>
        </div>
    );
};


// --- Recipe Card Component (Final) ---

const RecipeCard = ({ recipe, handleUserAction, userId, userFavorites }: 
    { 
        recipe: Recipe, 
        handleUserAction: () => void, 
        userId: string, 
        userFavorites: Set<string> 
    }) => { // FIX: Type props
    
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    
    const [isSaved, setIsSaved] = useState(false); 
    const [currentRating, setCurrentRating] = useState(0); 

    const hasScoreData = recipe.coverageScore !== undefined;

    // FIX: Load persisted state when component mounts/receives new recipe data
    useEffect(() => {
        // 1. Saved Status: Check if the current recipe ID exists in the fetched userFavorites Set
        setIsSaved(userFavorites.has(recipe._id));
        
        // 2. Rating Status: Check the recipe's embedded ratings for the current user's ID
        const userRating = recipe.ratings && recipe.ratings[userId] ? recipe.ratings[userId] : 0;
        setCurrentRating(userRating);
    }, [recipe.ratings, userFavorites, userId, recipe._id]);


    // Handler for saving/favoriting the recipe
    const handleSave = async () => {
        try {
            const response = await fetch(`${API_URL}/api/recipes/${recipe._id}/favorite`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });
            const data = await response.json();
            
            if (data.saved) {
                setIsSaved(true);
                alert(`Successfully saved ${recipe.name}! Suggestions updating...`);
                
                // FINAL FIX: Call the sequential parent handler
                handleUserAction(); 
                
            } else {
                 alert(`Recipe already saved!`);
            }
        } catch (error) {
            alert('Failed to save recipe.');
            console.error('Save error:', error);
        }
    };
    
    // Handler for rating the recipe
    const handleRate = async (ratingValue: number) => { // FIX: Type ratingValue
        setCurrentRating(ratingValue);
        try {
            const response = await fetch(`${API_URL}/api/recipes/${recipe._id}/rate`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, rating: ratingValue }) 
            });
            const data = await response.json();
            if (response.ok) {
                alert(`You rated ${recipe.name} ${ratingValue} stars!`);
                // FINAL FIX: Call the sequential parent handler
                handleUserAction(); 
            } else {
                alert(`Failed to submit rating: ${data.detail || 'Server error'}`);
            }
        } catch (error) {
            alert('Failed to connect to rating service.');
            console.error('Rate error:', error);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xl transition duration-300 hover:shadow-blue-300/50 transform hover:scale-[1.01] overflow-hidden">
            
            {/* RECIPE IMAGE DISPLAY */}
            {recipe.mainImageUrl && (
                <div className="h-52 w-full overflow-hidden bg-gray-100">
                    <img 
                        src={recipe.mainImageUrl} 
                        alt={recipe.name} 
                        className="w-full h-full object-cover transition duration-300 hover:opacity-90" 
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { 
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; 
                            target.src="/images/default.jpg"; 
                        }}
                    />
                </div>
            )}
            
            <div className="p-6">
                {/* Header, Rating, and Save Button */}
                <div className="flex justify-between items-center mb-3 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800">{recipe.name}</h3>
                    <div className="flex space-x-3 items-center">
                         <button 
                            onClick={handleSave} 
                            className={`p-2 rounded-full transition duration-200 transform hover:scale-110 ${
                                isSaved 
                                ? 'bg-red-500 text-white shadow-md' 
                                : 'bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-500'
                            }`}
                            title={isSaved ? "Saved!" : "Save as Favorite (User Feedback)"}
                         >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <span className="text-gray-600 text-sm font-semibold">★ {recipe.averageRating}</span>
                    </div>
                </div>

                <p className="text-sm text-gray-500 mb-4">{recipe.description}</p>
                
                {/* Score and Core Filters */}
                <div className="text-sm space-y-1 pb-3 border-b border-gray-100">
                    {hasScoreData && (
                        <p className="font-semibold text-blue-700 text-base flex items-center">
                            <span className="mr-1">✅</span> Match Score: {(recipe.coverageScore! * 100).toFixed(0)}%
                        </p>
                    )}
                    <p><strong className="text-gray-700">Cuisine:</strong> {recipe.filters.cuisine}</p>
                    <p><strong className="text-gray-700">Time:</strong> {recipe.filters.cookingTimeMinutes} min</p>
                    <p><strong className="text-gray-700">Difficulty:</strong> {recipe.filters.difficulty}</p>
                </div>
                
                {/* Missing Ingredients Section */}
                {hasScoreData && recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-200 shadow-inner">
                        <h4 className="font-semibold text-sm text-red-700 mb-1 flex items-center">
                            <span className="mr-1 text-base">⚠️</span> Missing ({recipe.missingIngredients.length})
                        </h4>
                        
                        {/* Substitution Suggestions */}
                        {Object.keys(recipe.substitutions || {}).length > 0 && (
                            <div className="mt-2 text-xs text-red-900">
                                <p className="font-semibold">Substitutions Available:</p>
                                <ul className="list-disc pl-4">
                                    {Object.entries(recipe.substitutions || {}).map(([missing, substitute]) => (
                                        <li key={missing}>Use <strong className="text-red-700">{substitute}</strong> for {missing}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}


                {/* Tags */}
                <div className="mt-3 flex flex-wrap gap-2">
                    {recipe.filters.isVegetarian && <span className="px-3 py-1 text-xs font-bold bg-teal-100 text-teal-800 rounded-full shadow-sm">VEGETARIAN</span>}
                    {recipe.filters.isGlutenFree && <span className="px-3 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-full shadow-sm">GLUTEN-FREE</span>}
                </div>
                
                {/* Rating Input */}
                <div className="mt-4 flex items-center border-t border-gray-100 pt-3">
                    <span className="text-sm font-medium text-gray-700 mr-3">Your Rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => handleRate(star)}
                            className={`w-6 h-6 text-xl transition duration-150 transform hover:scale-125 ${star <= currentRating ? 'text-amber-500' : 'text-gray-300'}`}
                            title={`${star} Star`}
                        >
                            ★
                        </button>
                    ))}
                </div>


                {/* Details Toggle */}
                <button
                    onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                    className="mt-4 w-full py-2 bg-gray-100 text-blue-700 font-bold rounded-lg hover:bg-blue-100 transition duration-200"
                >
                    {isDetailsOpen ? 'Hide Details ▲' : 'Show Full Recipe ▼'}
                </button>
            </div>
            
            {/* Expanded Details Section - HIGHLY VISUAL */}
            {isDetailsOpen && (
                <div className="bg-white p-6 border-t border-blue-100">
                    
                    <h4 className="font-bold text-lg mb-3 text-gray-800 border-b border-teal-300 pb-1 flex items-center">
                        <span className="text-xl mr-2 text-teal-500">🥣</span> Ingredients ({recipe.servingSize} Servings)
                    </h4>
                    <ul className="list-disc pl-5 text-sm text-gray-700 mb-5 space-y-1">
                        {recipe.ingredients.map((item, index) => (
                            <li key={index} className="hover:text-teal-700 transition duration-150">{item.display}</li>
                        ))}
                    </ul>

                    <h4 className="font-bold text-lg mb-3 text-gray-800 border-b border-teal-300 pb-1 flex items-center">
                        <span className="text-xl mr-2 text-teal-500">📝</span> Instructions
                    </h4>
                    <ol className="list-decimal pl-5 text-sm text-gray-700 mb-5 space-y-2">
                        {recipe.instructions.map((step, index) => (
                            <li key={index} className="font-medium bg-gray-50 p-2 rounded-md border-l-4 border-blue-300">{step}</li>
                        ))}
                    </ol>

                    <h4 className="font-bold text-lg mb-3 text-gray-800 border-b border-teal-300 pb-1 flex items-center">
                        <span className="text-xl mr-2 text-teal-500">📈</span> Nutrition (Per Serving)
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-sm text-gray-800 p-3 bg-blue-50 rounded-lg font-semibold shadow-inner border border-blue-200">
                        <p>Calories: <span className="text-blue-700">{recipe.nutritionalInfo.calories}</span></p>
                        <p>Protein: <span className="text-blue-700">{recipe.nutritionalInfo.proteinGrams}g</span></p>
                        <p>Fat: <span className="text-blue-700">{recipe.nutritionalInfo.fatGrams}g</span></p>
                    </div>
                </div>
            )}
        </div>
    );
};
