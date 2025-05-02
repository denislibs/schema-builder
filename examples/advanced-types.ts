/**
 * Пример использования расширенных типов данных PostgreSQL
 */
import { ColumnBuilder } from '../src';

// Пример создания таблицы с расширенными типами данных PostgreSQL
const createAdvancedTypesTable = () => {
  // Создание колонок с использованием статических методов для расширенных типов
  const idColumn = ColumnBuilder.BigSerial('id').primary();
  const smallIdColumn = ColumnBuilder.SmallInt('small_id').notNullable();
  const bigIdColumn = ColumnBuilder.BigInt('big_id').notNullable();
  const floatColumn = ColumnBuilder.Real('float_value');
  const doubleColumn = ColumnBuilder.DoublePrecision('double_value');
  const jsonDataColumn = ColumnBuilder.JSON('json_data');
  const binaryDataColumn = ColumnBuilder.BYTEA('binary_data');
  const networkColumn = ColumnBuilder.CIDR('network_address');
  const timeColumn = ColumnBuilder.Time('meeting_time');
  const durationColumn = ColumnBuilder.Interval('duration');
  const intArrayColumn = ColumnBuilder.Array('int_array', 'INTEGER');
  
  // Вывод SQL определений колонок
  console.log('Колонки таблицы с расширенными типами:');
  console.log(idColumn.toString());
  console.log(smallIdColumn.toString());
  console.log(bigIdColumn.toString());
  console.log(floatColumn.toString());
  console.log(doubleColumn.toString());
  console.log(jsonDataColumn.toString());
  console.log(binaryDataColumn.toString());
  console.log(networkColumn.toString());
  console.log(timeColumn.toString());
  console.log(durationColumn.toString());
  console.log(intArrayColumn.toString());
};

// Пример создания таблицы для хранения сетевой информации
const createNetworkInfoTable = () => {
  // Создание колонок с использованием статических методов для сетевых типов
  const idColumn = ColumnBuilder.Serial('id').primary();
  const deviceNameColumn = ColumnBuilder.Varchar('device_name', 100).notNullable();
  const ipAddressColumn = ColumnBuilder.INET('ip_address').notNullable();
  const networkRangeColumn = ColumnBuilder.CIDR('network_range');
  const macAddressColumn = ColumnBuilder.MACADDR('mac_address').notNullable();
  const lastSeenColumn = ColumnBuilder.Timestamp('last_seen').defaultTo('CURRENT_TIMESTAMP');
  const configColumn = ColumnBuilder.JSONB('config').defaultTo('{}');
  
  // Вывод SQL определений колонок
  console.log('\nКолонки таблицы network_info:');
  console.log(idColumn.toString());
  console.log(deviceNameColumn.toString());
  console.log(ipAddressColumn.toString());
  console.log(networkRangeColumn.toString());
  console.log(macAddressColumn.toString());
  console.log(lastSeenColumn.toString());
  console.log(configColumn.toString());
};

// Запуск примеров
createAdvancedTypesTable();
createNetworkInfoTable();