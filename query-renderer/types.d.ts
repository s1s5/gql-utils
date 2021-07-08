// type NodeType = {
//     readonly id: string
// }
// 
// type EdgesType<N extends NodeType> = ReadonlyArray<{
//     readonly cursor: string,
//     readonly node : N | null,
// } | null>
// 
// type ListType<N extends NodeType> = {
//     readonly pageInfo: {
//         readonly hasNextPage: boolean;
//         readonly hasPreviousPage: boolean;
//         readonly startCursor: string | null;
//         readonly endCursor: string | null;
//     }
//     readonly edges: EdgesType<N>
// }
// 
// export {NodeType, EdgesType, ListType}
