const express = require('express');
const router = express.Router();
const { Category } = require('../models/category');
const { Product } = require('../models/product');
const mongoose = require('mongoose');
const multer = require('multer');

// Defines the valid file extensions
const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
};

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('Invalid image type.');

        if (isValid) {
            uploadError = null;
        }
        cb(uploadError, 'public/uploads');
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split(' ').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${fileName}-${Date.now()}.${extension}`);
    },
});
const uploadOptions = multer({ storage: storage });

// GET all products
router.get(`/`, async (req, res) => {
    let filter = {};
    if (req.query.categories) {
        filter = {
            category: req.query.categories.split(','),
        };
    }

    const productList = await Product.find(filter).populate('category');

    if (!productList) {
        res.status(500).json({ success: false });
    }
    res.send(productList);
});

// GET a product by ID
router.get('/:id', async (req, res) => {
    const product = await Product.findById(req.params.id).populate('category');

    if (!product) {
        res.status(500).json({ success: false });
    }
    res.send(product);
});

// POST a new product
router.post(`/`, uploadOptions.single('image'), async (req, res) => {
    const category = await Category.findById(req.body.category);
    if (!category) return res.status(400).send('Invalid Category.');

    const file = req.file;
    if (!file) return res.status(400).send('No image in the request.');

    const fileName = file.filename;
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

    let product = new Product({
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.description,
        image: `${basePath}${fileName}`,
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured,
    });

    product = await product.save();

    if (!product) {
        return res.status(500).send('The product cannot be created.');
    }

    res.send(product);
});

// UPDATE a product
router.put('/:id', uploadOptions.single('image'), async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid Product ID');
    }
    const category = await Category.findById(req.body.category);
    if (!category) return res.status(400).send('Invalid Category.');

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(400).send('Invalid Product.');

    const file = req.file;
    let imagepath;

    if (file) {
        const fileName = file.filename;
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
        imagepath = `${basePath}${fileName}`;
    } else {
        imagepath = product.image;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            description: req.body.description,
            richDescription: req.body.richDescription,
            image: imagepath,
            brand: req.body.brand,
            price: req.body.price,
            category: req.body.category,
            countInStock: req.body.countInStock,
            rating: req.body.rating,
            numReviews: req.body.numReviews,
            isFeatured: req.body.isFeatured,
        },
        { new: true }
    );

    if (!updatedProduct)
        return res.status(500).send('The product cannot be updated.');

    res.send(updatedProduct);
});

// DELETE a product
router.delete('/:id', (req, res) => {
    Product.findByIdAndRemove(req.params.id)
        .then((product) => {
            if (product) {
                return res.status(200).json({
                    success: true,
                    message: 'The product was deleted.',
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'The product was not found.',
                });
            }
        })
        .catch((err) => {
            return res.status(500).json({ success: false, error: err });
        });
});

// COUNT products
router.get(`/get/count`, (req, res) => {
    Product.countDocuments().then((count) => {
        if (count) {
            return res.status(200).json({
                success: true,
                message: `There are ${count} products.`,
            });
        } else {
            return res
                .status(404)
                .json({
                    success: false,
                    message: 'Count failed! Please try again...',
                })
                .catch((err) => {
                    return res.status(500).json({ success: false, error: err });
                });
        }
    });
});

// COUNT featured products
router.get(`/get/featured/:count`, async (req, res) => {
    const count = req.params.count ? req.params.count : 0;
    const products = await Product.find({ isFeatured: true }).limit(+count);

    if (!products) {
        res.status(500).json({ success: false });
    }
    res.send(products);
});

// UPDATE images gallery
router.put(
    '/gallery-images/:id',
    uploadOptions.array('images', 10),
    async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).send('Invalid Product ID.');
        }
        const files = req.files;
        let imagesPaths = [];
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

        if (files) {
            files.map((file) => {
                imagesPaths.push(`${basePath}${file.filename}`);
            });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            {
                images: imagesPaths,
            },
            { new: true }
        );

        if (!product)
            return res.status(500).send('The gallery cannot be updated.');

        res.send(product);
    }
);

module.exports = router;
