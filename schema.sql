CREATE DATABASE IF NOT EXISTS bloodconnect;
USE bloodconnect;

CREATE TABLE IF NOT EXISTS donors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  age INT NOT NULL,
  blood_group VARCHAR(3) NOT NULL,
  city VARCHAR(40) NOT NULL,
  area VARCHAR(40) NOT NULL,
  phone VARCHAR(10) NOT NULL,
  available TINYINT(1) DEFAULT 1,
  consent TINYINT(1) NOT NULL
);

CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  patient_name VARCHAR(60) NOT NULL,
  units INT NOT NULL,
  hospital VARCHAR(80) NOT NULL,
  requester_phone VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES donors(id)
);

INSERT INTO donors (name, age, blood_group, city, area, phone, available, consent) VALUES
('Rohit Sharma', 25, 'B+', 'Gwalior', 'Thatipur', '9000000001', 1, 1),
('Anjali Mishra', 28, 'O+', 'Gwalior', 'City Centre', '9000000002', 1, 1),
('Imran Khan', 31, 'A+', 'Gwalior', 'Morar', '9000000003', 0, 1),
('Pooja Tiwari', 24, 'O-', 'Gwalior', 'Lashkar', '9000000004', 1, 1),
('Vikas Rawat', 35, 'AB+', 'Bhopal', 'MP Nagar', '9000000005', 1, 1),
('Neha Jain', 27, 'B+', 'Bhopal', 'Arera Colony', '9000000006', 1, 1),
('Sandeep Patel', 40, 'A-', 'Bhopal', 'Kolar Road', '9000000007', 0, 1),
('Farah Ali', 29, 'O+', 'Bhopal', 'Habibganj', '9000000008', 1, 1),
('Aman Dubey', 26, 'A+', 'Indore', 'Vijay Nagar', '9000000009', 1, 1),
('Kavita Lodhi', 33, 'B-', 'Indore', 'Palasia', '9000000010', 1, 1),
('Harsh Verma', 22, 'O+', 'Indore', 'Rau', '9000000011', 1, 1),
('Divya Nayak', 30, 'AB-', 'Jabalpur', 'Napier Town', '9000000012', 1, 1),
('Manoj Chouhan', 38, 'A+', 'Jabalpur', 'Wright Town', '9000000013', 1, 1),
('Sana Hussain', 23, 'B+', 'Ujjain', 'Freeganj', '9000000014', 1, 1);