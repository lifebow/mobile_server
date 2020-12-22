CREATE DATABASE IF NOT EXISTS assignment_mobile CHARACTER SET utf8mb4;
USE assignment_mobile;
DROP  table if exists product;
Drop table if exists user;
CREATE Table user(
	id int not null AUTO_INCREMENT,
	name varchar(20),
	passhash varchar(50),
	primary key(id)
);
DROP table if exists type_p;
create table type_p(
	type_id int not null AUTO_INCREMENT,
	name varchar(50),
	primary key(type_id)
);
Drop table if exists type_role;
create table type_role(
	role_name varchar(50),
	primary key(role_name)
);
Drop table if exists employee;
create table employee(
	employee_id int not null auto_increment,
	employee_name varchar(50),
	employee_role varchar(50),
	image varchar(50),
	phone_number varchar(50),
	primary key (employee_id),
	foreign key (employee_role) references type_role(role_name) on DELETE set NULL 
);
Drop table if exists warehouse;
Create table warehouse (
	warehouse_id int not null AUTO_INCREMENT,
	warehouse_name varchar(50),
	address varchar(200),
	manager_id int,
	phone_number varchar(10),
	primary key(warehouse_id),
	foreign key (manager_id) references employee(employee_id) on DELETE set NULL 
);
DROP table if exists product;
create table product(
	product_id int not null AUTO_INCREMENT,
	product_name varchar(50),
	type_id int,
	num_product int,
	warehouse_id int,
	primary key(product_id),
	Foreign key (type_id) references type_p(type_id) on DELETE set NULL,
	Foreign key (warehouse_id) references warehouse(warehouse_id) on DELETE CASCADE
);

Drop table if exists import;
create table import(
	import_id int not null AUTO_INCREMENT,
	product_id int,
	create_date datetime,
	receive_date datetime,
	num_product int,
	warehouse_id int,
	primary key (import_id),
	Foreign key (product_id) references product(product_id) on delete Cascade,
	Foreign key (warehouse_id) references warehouse(warehouse_id) on DELETE CASCADE
);
Drop table if exists export;
create table export(
	export_id int not null AUTO_INCREMENT,
	product_id int,
	create_date datetime,
	receive_date datetime,
	num_product int,
	warehouse_id int,
	primary key (import_id),
	Foreign key (product_id) references product(product_id) on delete Cascade,
	Foreign key (warehouse_id) references warehouse(warehouse_id) on DELETE CASCADE
)
