import type { Recipe as RecipeRow } from '$lib/types/database.types';

export type {
	Household,
	HouseholdInvite,
	HouseholdMember,
	ItemCatalog,
	ListItem,
	Profile,
	RecipeIngredient,
	RecipeStep,
	ShoppingList
} from '$lib/types/database.types';

export type {
	Chore,
	ChoreCompletion,
	Cookbook,
	CookbookComment,
	CookbookRecipe,
	RecipeComment,
	RecipeRating,
	RecipeTimelineEvent
} from '$lib/types/database.types';

export type Recipe = RecipeRow & { image_url?: string };

export type Member = {
	household_id: string;
	user_id: string;
	role: 'owner' | 'member';
	display_name: string;
	created_at: string;
};

export type ListSummary = {
	id: string;
	household_id: string;
	household_name: string;
	name: string;
	emoji: string;
	unchecked: number;
	total: number;
	sort_order: number;
	updated_at: string;
};
