const { DataTypes } = require('sequelize');

// Columns added after the first release. sequelize.sync() without { alter } (production)
// creates missing tables but never adds columns to existing ones, so they are added here.
const ADDED_COLUMNS = [
  { table: 'modules', column: 'source_key', definition: { type: DataTypes.STRING(150), allowNull: true } },
  { table: 'lessons', column: 'source_key', definition: { type: DataTypes.STRING(200), allowNull: true } }
];

const ensureSchema = async (sequelize) => {
  const queryInterface = sequelize.getQueryInterface();
  for (const { table, column, definition } of ADDED_COLUMNS) {
    const columns = await queryInterface.describeTable(table);
    if (!columns[column]) {
      await queryInterface.addColumn(table, column, definition);
      console.log(`✅ Added column ${table}.${column}`);
    }
  }
};

module.exports = { ensureSchema };
