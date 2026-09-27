import type { AiRecipeDraft } from '$lib/ai-recipe';
import type { MealieRecipeDraft, MealieImageDraft } from '$lib/mealie';
import { deserializeMealieImage } from '$lib/mealie';

export function aiDraftToMealie(
	draft: AiRecipeDraft,
	sourceKey: string,
	image: MealieImageDraft | null = null
): MealieRecipeDraft {
	return {
		title: draft.title,
		slug: sourceKey,
		description: draft.description,
		servings: draft.servings,
		calories: draft.calories,
		fat_g: draft.fat_g,
		protein_g: draft.protein_g,
		fiber_g: draft.fiber_g,
		ingredients: draft.ingredients,
		steps: draft.steps,
		cookbooks: [],
		rating: null,
		lastMade: null,
		comments: [],
		image,
		sourceKey,
		createdAt: null
	};
}

export function imageFromPayload(
	row: { name: string; type: string; base64: string } | null | undefined
) {
	return deserializeMealieImage(row ?? null);
}
