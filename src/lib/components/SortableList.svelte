<script lang="ts" generics="T">
	import { flip } from 'svelte/animate';
	import type { Snippet } from 'svelte';
	import { moveItem, sameOrder, sortableGroupValue } from '$lib/sort';
	import { resetSortableDrag, sortableDrag } from '$lib/sortable-drag.svelte';

	let {
		items,
		getId,
		group = '',
		disabled = false,
		onreorder,
		ontransfer,
		lead,
		children
	}: {
		items: T[];
		getId: (item: T) => string;
		group?: string;
		disabled?: boolean;
		onreorder: (items: T[]) => void;
		ontransfer?: (id: string, toGroup: string, index: number) => void;
		lead?: Snippet;
		children: Snippet<[T, { dragging: boolean }]>;
	} = $props();

	let root: HTMLUListElement | null = null;
	let draft = $state<T[] | null>(null);
	let draggingId = $state<string | null>(null);

	const view = $derived(draft ?? items);
	const canDrag = $derived(!disabled && (items.length > 1 || Boolean(ontransfer)));
	const dropTarget = $derived(
		sortableDrag.active &&
			Boolean(ontransfer) &&
			sortableDrag.group !== group &&
			sortableDrag.overGroup === group
	);

	function insertIndex(container: HTMLElement, clientY: number, skipId: string | null) {
		const nodes = [...container.querySelectorAll<HTMLElement>(':scope > [data-sortable-id]')];
		const others = skipId ? nodes.filter((node) => node.dataset.sortableId !== skipId) : nodes;
		for (let i = 0; i < others.length; i++) {
			const rect = others[i].getBoundingClientRect();
			if (clientY < rect.top + rect.height / 2) return i;
		}
		return others.length;
	}

	function groupRootFromPoint(x: number, y: number) {
		const hit = document.elementFromPoint(x, y);
		return hit?.closest<HTMLElement>('[data-sortable-group]') ?? null;
	}

	function onPointerDown(event: PointerEvent) {
		if (!canDrag || event.button !== 0) return;
		const handle = (event.target as HTMLElement | null)?.closest('[data-sortable-handle]');
		if (!handle || !root?.contains(handle)) return;
		const row = handle.closest<HTMLElement>('[data-sortable-id]');
		const id = row?.dataset.sortableId;
		if (!id) return;

		const startX = event.clientX;
		const startY = event.clientY;
		let moved = false;
		const startOrder = items.slice();

		const onMove = (move: PointerEvent) => {
			const dx = move.clientX - startX;
			const dy = move.clientY - startY;
			if (!moved && Math.hypot(dx, dy) < 8) return;
			if (!moved) {
				moved = true;
				draggingId = id;
				draft = startOrder.slice();
				sortableDrag.active = true;
				sortableDrag.id = id;
				sortableDrag.group = group;
				sortableDrag.overGroup = group;
				document.body.classList.add('select-none');
			}
			move.preventDefault();
			const targetRoot = groupRootFromPoint(move.clientX, move.clientY);
			const over = targetRoot?.dataset.sortableGroup ?? group;
			sortableDrag.overGroup = over;
			if (!root) return;
			if (over === group || !ontransfer) {
				const index = insertIndex(root, move.clientY, id);
				const current = draft ?? startOrder;
				const from = current.findIndex((item) => getId(item) === id);
				if (from === -1) return;
				const without = current.filter((item) => getId(item) !== id);
				const next = without.slice();
				next.splice(index, 0, current[from]);
				if (!sameOrder(current, next, getId)) draft = next;
			}
		};

		const onUp = (up: PointerEvent) => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onUp);
			document.removeEventListener('touchmove', onTouchMove);
			document.body.classList.remove('select-none');
			const finishId = id;
			const finishDraft = draft;
			const over = sortableDrag.overGroup;
			draggingId = null;
			draft = null;
			resetSortableDrag();
			if (!moved) return;
			if (ontransfer && over && over !== group) {
				const targetRoot = groupRootFromPoint(up.clientX, up.clientY);
				const index = targetRoot ? insertIndex(targetRoot, up.clientY, finishId) : 0;
				ontransfer(finishId, sortableGroupValue(over), index);
				return;
			}
			if (finishDraft && !sameOrder(startOrder, finishDraft, getId)) {
				onreorder(finishDraft);
			}
		};

		const onTouchMove = (touch: TouchEvent) => {
			if (moved) touch.preventDefault();
		};

		window.addEventListener('pointermove', onMove, { passive: false });
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
		document.addEventListener('touchmove', onTouchMove, { passive: false });
	}

	function onKeyDown(event: KeyboardEvent) {
		if (!canDrag) return;
		const handle = (event.target as HTMLElement | null)?.closest('[data-sortable-handle]');
		if (!handle || !root?.contains(handle)) return;
		const row = handle.closest<HTMLElement>('[data-sortable-id]');
		const id = row?.dataset.sortableId;
		if (!id) return;
		const index = view.findIndex((item) => getId(item) === id);
		if (index === -1) return;
		if (event.key === 'ArrowUp' && index > 0) {
			event.preventDefault();
			onreorder(moveItem(view, index, index - 1));
		}
		if (event.key === 'ArrowDown' && index < view.length - 1) {
			event.preventDefault();
			onreorder(moveItem(view, index, index + 1));
		}
	}

	function bindList(node: HTMLUListElement) {
		root = node;
		node.addEventListener('pointerdown', onPointerDown);
		node.addEventListener('keydown', onKeyDown);
		return () => {
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('keydown', onKeyDown);
			if (root === node) root = null;
		};
	}
</script>

<ul
	class={[
		'grid list-none gap-3 p-0',
		dropTarget && 'rounded-[1.6rem] ring-1 ring-gold/45 ring-offset-2 ring-offset-ink'
	]}
	data-sortable-group={group}
	{@attach bindList}
>
	{#if lead}
		<li class="list-none empty:hidden">{@render lead()}</li>
	{/if}
	{#each view as item (getId(item))}
		<li
			data-sortable-id={getId(item)}
			data-dragging={draggingId === getId(item) ? 'true' : undefined}
			animate:flip={{ duration: draggingId ? 0 : 160 }}
			class={['min-w-0 list-none', draggingId === getId(item) && 'relative z-10 opacity-90']}
		>
			{@render children(item, { dragging: draggingId === getId(item) })}
		</li>
	{/each}
</ul>
