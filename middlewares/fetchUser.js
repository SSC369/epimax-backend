import jwt from "jsonwebtoken";
const secretKey = "SSC";

const fetchUser = (req, res, next) => {
  const token = req.header("authorization");

  if (!token) {
    return res.status(401).json({
      status: false,
      msg: "Authentication failed! Please login to access data",
    });
  }
  try {
    //extract payload data from the jwt by verifying jwt with the help of secret key.
    const data = jwt.verify(token, secretKey);
    req.user = data;
    next();
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: "Server issue :(",
    });
  }
};

export default fetchUser;
