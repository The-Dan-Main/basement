export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProfileRow = {
	id: string;
	display_name: string;
	locale: string;
	created_at: string;
	updated_at: string;
};

export type HouseholdRow = {
	id: string;
	name: string;
	created_by: string;
	created_at: string;
	updated_at: string;
};

export type HouseholdMemberRow = {
	household_id: string;
	user_id: string;
	role: 'owner' | 'member';
	created_at: string;
};

export type HouseholdInviteRow = {
	id: string;
	household_id: string;
	email: string;
	token: string;
	invited_by: string;
	expires_at: string;
	accepted_at: string | null;
	created_at: string;
};

export type ListRow = {
	id: string;
	household_id: string;
	name: string;
	emoji: string;
	sort_order: number;
	archived_at: string | null;
	created_by: string;
	created_at: string;
	updated_at: string;
};

export type ListItemRow = {
	id: string;
	list_id: string;
	name: string;
	quantity: string;
	note: string;
	category: string;
	checked: boolean;
	checked_at: string | null;
	checked_by: string | null;
	sort_order: number;
	created_by: string;
	created_at: string;
	updated_at: string;
};

export type ItemCatalogRow = {
	id: string;
	household_id: string;
	name: string;
	display_name: string;
	category: string;
	use_count: number;
	last_used_at: string;
	created_at: string;
	updated_at: string;
};

export type RecipeRow = {
	id: string;
	household_id: string;
	title: string;
	description: string;
	servings: number;
	image_path: string;
	calories: number;
	fat_g: number;
	protein_g: number;
	fiber_g: number;
	created_by: string;
	created_at: string;
	updated_at: string;
};

export type RecipeIngredientRow = {
	id: string;
	recipe_id: string;
	name: string;
	amount: number | null;
	unit: string;
	note: string;
	category: string;
	sort_order: number;
};

export type RecipeStepRow = {
	id: string;
	recipe_id: string;
	instruction: string;
	sort_order: number;
};

type Table<Row, Insert = Partial<Row> & Record<string, never>, Update = Partial<Row>> = {
	Row: Row;
	Insert: Insert;
	Update: Update;
	Relationships: [];
};

export interface Database {
	public: {
		Tables: {
			profiles: Table<
				ProfileRow,
				{ id: string; display_name?: string; locale?: string },
				Partial<Omit<ProfileRow, 'id'>>
			>;
			households: Table<
				HouseholdRow,
				{ name: string; created_by: string; id?: string; created_at?: string; updated_at?: string },
				Partial<HouseholdRow>
			>;
			household_members: Table<
				HouseholdMemberRow,
				{ household_id: string; user_id: string; role?: HouseholdMemberRow['role'] },
				Partial<Omit<HouseholdMemberRow, 'household_id' | 'user_id'>>
			>;
			household_invites: Table<
				HouseholdInviteRow,
				{
					household_id: string;
					email: string;
					token: string;
					invited_by: string;
					expires_at?: string;
					id?: string;
				},
				Partial<Omit<HouseholdInviteRow, 'id'>>
			>;
			lists: Table<
				ListRow,
				{
					household_id: string;
					name: string;
					created_by: string;
					id?: string;
					emoji?: string;
					sort_order?: number;
					archived_at?: string | null;
					created_at?: string;
					updated_at?: string;
				},
				Partial<ListRow>
			>;
			list_items: Table<
				ListItemRow,
				{
					list_id: string;
					name: string;
					created_by: string;
					id?: string;
					quantity?: string;
					note?: string;
					category?: string;
					checked?: boolean;
					checked_at?: string | null;
					checked_by?: string | null;
					sort_order?: number;
					created_at?: string;
					updated_at?: string;
				},
				Partial<ListItemRow>
			>;
			item_catalog: Table<
				ItemCatalogRow,
				{
					household_id: string;
					name: string;
					display_name: string;
					id?: string;
					category?: string;
					use_count?: number;
					last_used_at?: string;
					created_at?: string;
					updated_at?: string;
				},
				Partial<ItemCatalogRow>
			>;
			recipes: Table<
				RecipeRow,
				{
					household_id: string;
					title: string;
					created_by: string;
					id?: string;
					description?: string;
					servings?: number;
					image_path?: string;
					calories?: number;
					fat_g?: number;
					protein_g?: number;
					fiber_g?: number;
					created_at?: string;
					updated_at?: string;
				},
				Partial<RecipeRow>
			>;
			recipe_ingredients: Table<
				RecipeIngredientRow,
				{
					recipe_id: string;
					name: string;
					id?: string;
					amount?: number | null;
					unit?: string;
					note?: string;
					category?: string;
					sort_order?: number;
				},
				Partial<RecipeIngredientRow>
			>;
			recipe_steps: Table<
				RecipeStepRow,
				{
					recipe_id: string;
					instruction: string;
					id?: string;
					sort_order?: number;
				},
				Partial<RecipeStepRow>
			>;
		};
		Views: Record<never, never>;
		Functions: Record<never, never>;
		Enums: Record<never, never>;
		CompositeTypes: Record<never, never>;
	};
}

export type Profile = ProfileRow;
export type Household = HouseholdRow;
export type HouseholdMember = HouseholdMemberRow;
export type HouseholdInvite = HouseholdInviteRow;
export type ShoppingList = ListRow;
export type ListItem = ListItemRow;
export type ItemCatalog = ItemCatalogRow;
export type Recipe = RecipeRow;
export type RecipeIngredient = RecipeIngredientRow;
export type RecipeStep = RecipeStepRow;
