const bcrypt = require("bcrypt");
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// =========================
// MYSQL CONNECTION
// =========================

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "nova_store"
});

db.connect((err) => {
    if (err) {
        console.error("MySQL connection failed:", err);
        return;
    }

    console.log("Connected to MySQL!");
});

// =========================
// TEST
// =========================

app.get("/", (req, res) => {
    res.send("NOVA backend is running!");
});

// =========================
// RECOMMENDED PRODUCTS
// =========================

app.get("/api/recommended-products", (req, res) => {

    const sql = "SELECT * FROM products ORDER BY RAND() LIMIT 8";

    db.query(sql, (err, results) => {

        if (err) {
            console.error("Error fetching recommended products:", err);
            return res.status(500).json({
                error: "Failed to fetch recommended products"
            });
        }

        res.json(results);
    });
});

// =========================
// HERO PRODUCTS
// =========================

app.get("/api/hero-products", (req, res) => {

    const sql = "SELECT * FROM products ORDER BY RAND() LIMIT 3";

    db.query(sql, (err, results) => {

        if (err) {
            console.error("Error fetching hero products:", err);
            return res.status(500).json({
                error: "Failed to fetch hero products"
            });
        }

        res.json(results);
    });
});
app.get("/api/search", (req, res) => {

    const query = req.query.q;

    if (!query || query.trim() === "") {
        return res.json([]);
    }

    const searchTerm = `%${query.trim()}%`;

    const sql = `
    SELECT
        products.*,
        COALESCE(AVG(reviews.rating), 0) AS averageRating
    FROM products
    LEFT JOIN reviews
        ON products.id = reviews.product_id
    WHERE products.name LIKE ?
       OR products.category LIKE ?
       OR products.description LIKE ?
    GROUP BY products.id
`;

    db.query(
        sql,
        [searchTerm, searchTerm, searchTerm],
        (err, results) => {

            if (err) {
                console.error("Search error:", err);

                return res.status(500).json({
                    error: "Search failed"
                });
            }

            res.json(results);
        }
    );
});
app.get("/api/all-products", (req, res) => {

    const sql = "SELECT * FROM products ORDER BY id ASC";

    db.query(sql, (err, results) => {

        if (err) {
            console.error("Error fetching all products:", err);

            return res.status(500).json({
                error: "Failed to fetch products"
            });
        }

        res.json(results);
    });
});
app.get("/api/product/:id", (req, res) => {

    const productId = req.params.id;

    const sql = "SELECT * FROM products WHERE id = ?";

    db.query(sql, [productId], (err, results) => {

        if (err) {
            console.error("Product fetch error:", err);

            return res.status(500).json({
                error: "Failed to fetch product"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                error: "Product not found"
            });
        }

        res.json(results[0]);
    });
});
app.get("/api/product/:id/images", (req, res) => {

    const productId = req.params.id;

    const sql = `
        SELECT
            id,
            image_url,
            is_primary
        FROM product_images
        WHERE product_id = ?
        ORDER BY is_primary DESC, id ASC
    `;

    db.query(sql, [productId], (err, results) => {

        if (err) {

            console.error(
                "Product images fetch error:",
                err
            );

            return res.status(500).json({
                error: "Failed to fetch product images"
            });
        }

        res.json(results);

    });
app.put("/api/product/:id/images", (req, res) => {
    const productId = req.params.id;
    const images = req.body.images || [];

    if (images.length === 0) {
        return res.json({
            success: true,
            message: "No new images to add"
        });
    }

    const values = images.map(image => [
        productId,
        image,
        false
    ]);

    const sql = `
        INSERT INTO product_images
        (product_id, image_url, is_primary)
        VALUES ?
    `;

    db.query(sql, [values], (err) => {
        if (err) {
            console.error("Add product images error:", err);

            return res.status(500).json({
                success: false,
                message: "Failed to add product images"
            });
        }

        res.json({
            success: true,
            message: "New product images added successfully"
        });
    });
});
app.delete("/api/product-image/:imageId", (req, res) => {
    const imageId = req.params.imageId;

    const sql = `
        DELETE FROM product_images
        WHERE id = ?
    `;

    db.query(sql, [imageId], (err, result) => {
        if (err) {
            console.error("Delete product image error:", err);

            return res.status(500).json({
                success: false,
                message: "Failed to delete image"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Image not found"
            });
        }

        res.json({
            success: true,
            message: "Image deleted successfully"
        });
    });
});

});
app.put("/api/product/:id", (req, res) => {
    const productId = req.params.id;

    const {
        name,
        category,
        price,
        stock,
        description,
        image
    } = req.body;

    const sql = `
        UPDATE products
        SET
            name = ?,
            category = ?,
            price = ?,
            stock = ?,
            description = ?,
            image = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [name, category, price, stock, description, image, productId],
        (err, result) => {
            if (err) {
                console.error("Product update error:", err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to update product"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            res.json({
                success: true,
                message: "Product updated successfully"
            });
        }
    );
});
app.get("/api/products", (req, res) => {

    const sql = `
        SELECT *
        FROM products
        ORDER BY id ASC
    `;

    db.query(sql, (err, results) => {

        if (err) {

            console.error(
                "Products error:",
                err
            );

            return res.status(500).json({
                error: "Could not load products"
            });
        }

        res.json(results);

    });

});
app.post("/api/signup", async (req, res) => {

    const { name, email, password } = req.body;


    if (!name || !email || !password) {

        return res.status(400).json({
            error: "All fields are required"
        });

    }


    try {

        // Hash the password
        const hashedPassword =
            await bcrypt.hash(password, 10);


        const sql = `
            INSERT INTO users
            (name, email, password)
            VALUES (?, ?, ?)
        `;


        db.query(
            sql,
            [name, email, hashedPassword],
            (err, result) => {

                if (err) {

                    if (err.code === "ER_DUP_ENTRY") {

                        return res.status(409).json({
                            error:
                                "Email already registered"
                        });

                    }


                    console.error(
                        "Signup error:",
                        err
                    );


                    return res.status(500).json({
                        error:
                            "Could not create account"
                    });

                }


                res.json({

                    success: true,

                    message:
                        "Account created successfully"

                });

            }
        );


    } catch (error) {

        console.error(
            "Password hashing error:",
            error
        );


        res.status(500).json({

            error:
                "Could not create account"

        });

    }

});
app.post("/api/login", async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {

        return res.status(400).json({
            error: "Email and password are required"
        });

    }

    const sql =
        "SELECT * FROM users WHERE email = ?";

    db.query(
        sql,
        [email],
        async (err, results) => {

            if (err) {

                console.error(
                    "Login error:",
                    err
                );

                return res.status(500).json({
                    error: "Login failed"
                });

            }

            if (results.length === 0) {

                return res.status(401).json({
                    error: "Invalid email or password"
                });

            }

            const user = results[0];

            try {

                const passwordMatch =
                    await bcrypt.compare(
                        password,
                        user.password
                    );

                if (!passwordMatch) {

                    return res.status(401).json({
                        error:
                            "Invalid email or password"
                    });

                }

                res.json({
                    success: true,
                    message: "Login successful",
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email
                    }
                });

            } catch (error) {

                console.error(
                    "Password comparison error:",
                    error
                );

                res.status(500).json({
                    error: "Login failed"
                });

            }

        }
    );

});
app.post("/api/retailer-login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required"
        });
    }

    const sql = `
        SELECT *
        FROM retailers
        WHERE email = ?
    `;

    db.query(sql, [email], async (err, results) => {

        if (err) {
            console.error("Retailer login error:", err);

            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const retailer = results[0];

        const passwordMatch =
            await bcrypt.compare(
                password,
                retailer.password
            );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        res.json({
            success: true,
            retailer: {
                id: retailer.id,
                name: retailer.name,
                email: retailer.email
            }
        });

    });

});
app.post("/api/retailer-signup", async (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "All fields are required"
        });
    }

    try {

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO retailers
            (name, email, password)
            VALUES (?, ?, ?)
        `;

        db.query(
            sql,
            [name, email, hashedPassword],
            (err, result) => {

                if (err) {

                    console.error(
                        "Retailer signup error:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message: "Could not create retailer"
                    });
                }

                res.json({
                    success: true,
                    message: "Retailer account created"
                });

            }
        );

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });

    }

});
app.post("/api/orders", (req, res) => {

    const { userId, cart } = req.body;

    if (!userId || !cart || cart.length === 0) {
        return res.status(400).json({
            error: "Invalid order"
        });
    }

    const total = cart.reduce((sum, item) => {

        const price =
            parseFloat(
                String(item.price)
                    .replace("₹", "")
                    .replace(/,/g, "")
            );

        return sum + (price * item.quantity);

    }, 0);


    const orderSql = `
        INSERT INTO orders
        (user_id, total)
        VALUES (?, ?)
    `;


    db.query(
        orderSql,
        [userId, total],
        (err, result) => {

            if (err) {

                console.error(
                    "Order creation error:",
                    err
                );

                return res.status(500).json({
                    error: "Could not create order"
                });

            }


            const orderId =
                result.insertId;


            const itemSql = `
                INSERT INTO order_items
                (order_id, product_id, product_name, price, quantity)
                VALUES ?
            `;


            const values = cart.map(item => [

                orderId,

                item.id,

                item.name,

                parseFloat(
                    String(item.price)
                        .replace("₹", "")
                        .replace(/,/g, "")
                ),

                item.quantity

            ]);


            db.query(
                itemSql,
                [values],
                (itemErr) => {

                    if (itemErr) {

                        console.error(
                            "Order items error:",
                            itemErr
                        );

                        return res.status(500).json({
                            error:
                                "Could not save order items"
                        });

                    }


                    res.json({

                        success: true,

                        orderId: orderId

                    });

                }
            );

        }
    );

});
app.get("/api/orders/:userId", (req, res) => {

    const userId = req.params.userId;

    const orderSql = `
        SELECT id, total, status, created_at
        FROM orders
        WHERE user_id = ?
        ORDER BY created_at DESC
    `;

    db.query(orderSql, [userId], (err, orders) => {

        if (err) {
            console.error("Orders error:", err);

            return res.status(500).json({
                error: "Could not load orders"
            });
        }

        if (orders.length === 0) {
            return res.json([]);
        }

        const orderIds = orders.map(order => order.id);

        const itemSql = `
    SELECT
        order_items.order_id,
        order_items.product_id,
        order_items.product_name,
        order_items.price,
        order_items.quantity,
        products.image
    FROM order_items
    JOIN products
        ON order_items.product_id = products.id
    WHERE order_items.order_id IN (?)
`;

        db.query(
            itemSql,
            [orderIds],
            (itemErr, items) => {

                if (itemErr) {
                    console.error(
                        "Order items error:",
                        itemErr
                    );

                    return res.status(500).json({
                        error:
                            "Could not load order items"
                    });
                }

                const result = orders.map(order => {

                    return {
                        ...order,

                        items: items.filter(
                            item =>
                                item.order_id === order.id
                        )

                    };

                });

                res.json(result);

            }
        );

    });

});
app.get("/api/retailer/orders", (req, res) => {
    const sql = `
        SELECT
            orders.id AS order_id,
            orders.total,
            orders.status,
            orders.created_at,
            users.name AS customer_name,
            users.email AS customer_email
        FROM orders
        JOIN users
            ON orders.user_id = users.id
        ORDER BY orders.created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Retailer orders error:", err);

            return res.status(500).json({
                error: "Could not load retailer orders"
            });
        }

        res.json(results);
    });
});
app.get("/api/retailer/orders/:orderId", (req, res) => {
    const orderId = req.params.orderId;

    const orderSql = `
        SELECT
            orders.id AS order_id,
            orders.total,
            orders.status,
            orders.created_at,
            users.name AS customer_name,
            users.email AS customer_email
        FROM orders
        JOIN users
            ON orders.user_id = users.id
        WHERE orders.id = ?
    `;

    db.query(orderSql, [orderId], (err, orderResults) => {

        if (err) {
            console.error("Retailer order details error:", err);

            return res.status(500).json({
                error: "Could not load order"
            });
        }

        if (orderResults.length === 0) {
            return res.status(404).json({
                error: "Order not found"
            });
        }

        const itemsSql = `
            SELECT
                product_id,
                product_name,
                price,
                quantity
            FROM order_items
            WHERE order_id = ?
        `;

        db.query(itemsSql, [orderId], (err, itemResults) => {

            if (err) {
                console.error("Order items error:", err);

                return res.status(500).json({
                    error: "Could not load order items"
                });
            }

            res.json({
                order: orderResults[0],
                items: itemResults
            });

        });

    });
});
app.put("/api/retailer/orders/:orderId/status", (req, res) => {
    const orderId = req.params.orderId;
    const { status } = req.body;

    const allowedStatuses = [
        "Pending",
        "Packed",
        "Shipped",
        "Out for Delivery",
        "Delivered"
    ];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid order status"
        });
    }

    const sql = `
        UPDATE orders
        SET status = ?
        WHERE id = ?
    `;

    db.query(sql, [status, orderId], (err, result) => {

        if (err) {
            console.error("Order status update error:", err);

            return res.status(500).json({
                success: false,
                message: "Could not update order status"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.json({
            success: true,
            message: "Order status updated successfully"
        });

    });
});
app.get("/api/retailer/dashboard-stats", (req, res) => {

    const sql = `
        SELECT
            (SELECT COUNT(*) FROM products) AS totalProducts,

            (SELECT COUNT(*) FROM orders) AS totalOrders,

            (SELECT COALESCE(SUM(total), 0) FROM orders) AS totalSales,

            (SELECT COUNT(*) FROM products WHERE stock <= 5) AS lowStock
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error("Dashboard stats error:", err);

            return res.status(500).json({
                error: "Could not load dashboard statistics"
            });
        }

        res.json(results[0]);

    });

});
// =========================
// GET PRODUCT RATING SUMMARY
// =========================

app.get("/api/reviews/summary/:productId", (req, res) => {

    const productId = req.params.productId;

    const sql = `
        SELECT
            COUNT(*) AS reviewCount,
            COALESCE(AVG(rating), 0) AS averageRating,

            SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS fiveStars,
            SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS fourStars,
            SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS threeStars,
            SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS twoStars,
            SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS oneStar

        FROM reviews
        WHERE product_id = ?
    `;

    db.query(sql, [productId], (err, results) => {

        if (err) {

            console.error(
                "Rating summary error:",
                err
            );

            return res.status(500).json({
                error: "Could not load rating"
            });

        }

        const data = results[0];

        res.json({

            reviewCount: Number(data.reviewCount),

            averageRating: Number(
                data.averageRating
            ).toFixed(1),

            breakdown: {
                5: Number(data.fiveStars),
                4: Number(data.fourStars),
                3: Number(data.threeStars),
                2: Number(data.twoStars),
                1: Number(data.oneStar)
            }

        });

    });

});


// =========================
// GET PRODUCT REVIEWS
// =========================

app.get("/api/reviews/:productId", (req, res) => {

    const productId = req.params.productId;

    const sql = `
        SELECT
            reviews.id,
            reviews.rating,
            reviews.review_text,
            reviews.created_at,
            users.name
        FROM reviews
        JOIN users
            ON reviews.user_id = users.id
        WHERE reviews.product_id = ?
        ORDER BY reviews.created_at DESC
    `;

    db.query(sql, [productId], (err, results) => {

        if (err) {
            console.error("Reviews error:", err);
            return res.status(500).json({
                error: "Could not load reviews"
            });
        }

        res.json(results);

    });

});
// =========================
// SUBMIT PRODUCT REVIEW
// =========================

app.post("/api/reviews", (req, res) => {

    const {
        userId,
        productId,
        rating,
        reviewText
    } = req.body;

    if (
        !userId ||
        !productId ||
        !rating ||
        rating < 1 ||
        rating > 5
    ) {
        return res.status(400).json({
            error: "Invalid review"
        });
    }

    const sql = `
        INSERT INTO reviews
        (user_id, product_id, rating, review_text)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            userId,
            productId,
            rating,
            reviewText || ""
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "Review submission error:",
                    err
                );

                return res.status(500).json({
                    error: "Could not submit review"
                });

            }

            res.json({
                success: true,
                reviewId: result.insertId
            });

        }
    );

});
// =========================
// START SERVER
// =========================

app.listen(3000, () => {
    console.log("NOVA server running on http://localhost:3000");
});