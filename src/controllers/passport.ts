/* eslint-disable no-shadow */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Strategy } from "passport-google-oauth20";
import { Strategy as FBStrategy } from "passport-facebook";
import passport, { PassportStatic } from "passport";
import { UserModel } from "../models/userModel";
import { Request, Response } from "express";
import { generateToken } from "../utils/auth";
import ResponseStatus from "../utils/response";

const responseStatus = new ResponseStatus();

export const googleStrategy = (passport: PassportStatic) => {
  passport.use(
    new Strategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        callbackURL: "/api/v1/music-box-api/auth/google/success",
      },
      (accessToken: string, refreshToken: string, profile: any, done) => {
        // console.log(profile);

        return done(null, profile);
      }
    )
  );
};

export const facebookStrategy = (passport: passport.PassportStatic) => {
  passport.use(
    new FBStrategy(
      {
        clientID: process.env.FACEBOOK_CLIENT_ID as string,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
        callbackURL:
          "https://music-box-b.herokuapp.com/api/v1/music-box-api/fb/facebook/success",
        profileFields: ["id", "displayName", "photos", "email"],
      },
      (accessToken: string, refreshToken: string, profile: any, done) => {
        return done(null, profile);
      }
    )
  );
};

export const googleAuthController = async (req: Request, res: Response) => {
  // if user is not authenticated
  if (!req.session.passport) {
    responseStatus.setError(400, "bad request");
    return responseStatus.send(res);
  }

  const email = req.session.passport.user.emails[0].value;
  const firstName = req.session.passport.user.name.givenName;
  const lastName = req.session.passport.user.name.familyName;

  try {
    // find user by email;
    const user = await UserModel.findOne({ email });

    // if no user, create new user
    if (!user) {
      const newUser = await UserModel.create({
        firstName,
        lastName,
        email,
        provider: "google",
      });

      const token = generateToken(newUser._id!);
      const data = {
        token,
        user: newUser,
      };

      responseStatus.setSuccess(201, "successful", data);
      return responseStatus.send(res);
    }

    // if provider is not google,
    if (user.provider === "facebook") {
      responseStatus.setError(
        400,
        "you already have an account with facebook, please login with facebook"
      );
      return responseStatus.send(res);
    }

    // if provider is not facebook,
    if (user.provider === "local") {
      responseStatus.setError(400, "login with your email and password");
      return responseStatus.send(res);
    }

    // if user is a registered user
    const token = generateToken(user._id!);
    const data = {
      token,
      user,
    };
    return res.redirect(`${process.env.REDIRECT_URL}/${token}`);
    // responseStatus.setSuccess(201, "successful", data);
    // return responseStatus.send(res);
  } catch (e) {
    responseStatus.setError(500, "an error occurred");
    return responseStatus.send(res);
  }
};

passport.serializeUser(function (profile: any, done) {
  done(null, profile);
});
// used to deserialize the user
passport.deserializeUser(function (profile: any, done) {
  return done(null, profile);
});

export const fbAuthController = async (req: Request, res: Response) => {
  // if user is not authenticated
  if (!req.session.passport) {
    responseStatus.setError(400, "bad request");
    return responseStatus.send(res);
  }

  const email = req.session.passport.user.emails[0].value;
  const firstName = req.session.passport.user.displayName.split(" ")[0];
  const lastName = req.session.passport.user.displayName.split(" ")[1];

  try {
    // find user by email;
    const user = await UserModel.findOne({ email });

    if (!user) {
      const newUser = await UserModel.create({
        firstName,
        lastName,
        email,
        provider: "facebook",
      });

      const token = generateToken(newUser._id!);
      const data = {
        token,
        user: newUser,
      };

      responseStatus.setSuccess(201, "successful", data);
      return responseStatus.send(res);
    }

    if (user.provider === "google") {
      responseStatus.setError(
        400,
        "you already have an account with google, please login with google"
      );
      return responseStatus.send(res);
    }

    const token = generateToken(user._id!);

    const data = {
      token,
      user,
    };

    responseStatus.setSuccess(201, "successful", data);
    return responseStatus.send(res);
  } catch (e) {
    responseStatus.setError(500, "an error occurred");
    return responseStatus.send(res);
  }
};
