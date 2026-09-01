import assert from 'node:assert/strict';
import {
	groupOrderPatches,
	insertAt,
	moveItem,
	nextFrontSortOrder,
	orderPatches,
	sameOrder,
	sortableGroupKey,
	sortableGroupValue,
	transferToGroup
} from './sort.ts';

assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
assert.deepEqual(moveItem(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
assert.deepEqual(moveItem(['a', 'b', 'c'], 1, 1), ['a', 'b', 'c']);
assert.deepEqual(insertAt(['a', 'c'], 1, 'b'), ['a', 'b', 'c']);
assert.equal(nextFrontSortOrder([]), 0);
assert.equal(nextFrontSortOrder([3, 1, 8]), 0);
assert.equal(nextFrontSortOrder([0, 1, 2]), -1);
assert.equal(
	sameOrder([{ id: 'a' }, { id: 'b' }], [{ id: 'a' }, { id: 'b' }], (row) => row.id),
	true
);
assert.equal(
	sameOrder([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'a' }], (row) => row.id),
	false
);
assert.deepEqual(orderPatches([{ id: 'x' }, { id: 'y' }]), [
	{ id: 'x', sort_order: 0 },
	{ id: 'y', sort_order: 1 }
]);

const transferred = transferToGroup(
	[
		{
			category: 'produce',
			items: [
				{ id: 'apples', category: 'produce' },
				{ id: 'pears', category: 'produce' }
			]
		},
		{ category: 'dairy', items: [{ id: 'milk', category: 'dairy' }] }
	],
	'pears',
	'dairy',
	0
);
assert.deepEqual(
	transferred.map((group) => ({
		category: group.category,
		ids: group.items.map((item) => item.id)
	})),
	[
		{ category: 'produce', ids: ['apples'] },
		{ category: 'dairy', ids: ['pears', 'milk'] }
	]
);
assert.deepEqual(groupOrderPatches(transferred), [
	{ id: 'apples', sort_order: 0, category: 'produce' },
	{ id: 'pears', sort_order: 1, category: 'dairy' },
	{ id: 'milk', sort_order: 2, category: 'dairy' }
]);
assert.equal(sortableGroupKey(''), '__none__');
assert.equal(sortableGroupValue('__none__'), '');
assert.equal(sortableGroupKey('dairy'), 'dairy');

console.log('sort.test.ts ok');
