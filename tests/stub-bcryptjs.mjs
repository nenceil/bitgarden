export default { hash: async (p) => 'h:' + p, compare: async (p, h) => h === 'h:' + p };
