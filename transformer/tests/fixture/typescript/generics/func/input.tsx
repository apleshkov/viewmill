export default function <T, U extends Array<T>>(a: T, b: U) {
	return <span>{a}, {b.length}</span>;
};
