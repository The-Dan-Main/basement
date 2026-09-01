export type {
	Household,
	HouseholdInvite,
	HouseholdMember,
	ItemCatalog,
	ListItem,
	Profile,
	ShoppingList
} from '$lib/types/database.types';

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
	unchecked: number;
	total: number;
	updated_at: string;
};
