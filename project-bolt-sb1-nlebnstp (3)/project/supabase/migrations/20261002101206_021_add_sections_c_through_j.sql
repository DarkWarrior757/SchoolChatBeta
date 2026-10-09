/*
# Add sections A through J for all academic classes

Currently only Class 7 and Class 8 have 2 sections each (A, B).
This adds sections C through J for both classes so there are 10 sections total (A–J).

1. New sections
- Class 7: 7-C through 7-J (8 new sections)
- Class 8: 8-C through 8-J (8 new sections)
*/

INSERT INTO sections (class_id, name, description)
SELECT c.id, c.name || '-' || letter, 'Section ' || letter || ' of ' || c.name
FROM classes c
CROSS JOIN (VALUES ('C'), ('D'), ('E'), ('F'), ('G'), ('H'), ('I'), ('J')) AS v(letter)
WHERE c.is_club = false
  AND NOT EXISTS (
    SELECT 1 FROM sections s WHERE s.class_id = c.id AND s.name = c.name || '-' || letter
  );
