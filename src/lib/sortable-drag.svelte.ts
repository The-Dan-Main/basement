export const sortableDrag = $state({
	active: false,
	id: '',
	group: '',
	overGroup: ''
});

export function resetSortableDrag() {
	sortableDrag.active = false;
	sortableDrag.id = '';
	sortableDrag.group = '';
	sortableDrag.overGroup = '';
}
