const { DataTypes } = require('sequelize');

// Columns added after the first release. sequelize.sync() without { alter } (production)
// creates missing tables but never adds columns to existing ones, so they are added here.
const ADDED_COLUMNS = [
  { table: 'modules', column: 'source_key', definition: { type: DataTypes.STRING(150), allowNull: true } },
  { table: 'lessons', column: 'source_key', definition: { type: DataTypes.STRING(200), allowNull: true } },
  { table: 'lessons', column: 'checklist', definition: { type: DataTypes.JSON, allowNull: true } },
  { table: 'user_progresses', column: 'draft', definition: { type: DataTypes.JSON, allowNull: true } },
  { table: 'user_progresses', column: 'draft_saved_at', definition: { type: DataTypes.DATE, allowNull: true } },
  { table: 'user_progresses', column: 'progress_percent', definition: { type: DataTypes.FLOAT, allowNull: true } }
];

// ENUM columns that gained values after the first release
const WIDENED_ENUMS = [
  { table: 'lesson_attempts', column: 'kind', values: ['quiz', 'lab', 'challenge'], allowNull: false }
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
  for (const { table, column, values, allowNull } of WIDENED_ENUMS) {
    const columns = await queryInterface.describeTable(table);
    const missing = values.filter((value) => !columns[column]?.type.includes(`'${value}'`));
    if (columns[column] && missing.length) {
      await queryInterface.changeColumn(table, column, { type: DataTypes.ENUM(...values), allowNull });
      console.log(`✅ Added ${missing.join(', ')} to ${table}.${column}`);
    }
  }
};

module.exports = { ensureSchema };
