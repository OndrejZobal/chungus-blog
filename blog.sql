-- MySQL Script generated by MySQL Workbench
-- Wed Jan 26 17:30:55 2022
-- Model: New Model    Version: 1.0
-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema blog_db
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema blog_db
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `blog_db` DEFAULT CHARACTER SET utf8 ;
USE `blog_db` ;

-- -----------------------------------------------------
-- Table `blog_db`.`Article`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `blog_db`.`Article` (
  `idArticle` INT NOT NULL AUTO_INCREMENT,
  `urlidArticle` VARCHAR(20) NOT NULL,
  `abstractArticle` VARCHAR(200) NULL,
  `publicatoinDateArticle` DATE NOT NULL,
  `editDateArticle` DATE NULL,
  `pathToArticle` VARCHAR(50) NOT NULL,
  `hiddenTagsArticle` VARCHAR(100) NULL,
  `titleArticle` VARCHAR(25) NOT NULL,
  PRIMARY KEY (`idArticle`),
  UNIQUE INDEX `idArticle_UNIQUE` (`idArticle` ASC) VISIBLE,
  UNIQUE INDEX `URLID_UNIQUE` (`urlidArticle` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `blog_db`.`Author`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `blog_db`.`Author` (
  `idAuthor` INT NOT NULL AUTO_INCREMENT,
  `nameAuthor` VARCHAR(20) NULL,
  `surnameAuthor` VARCHAR(15) NULL,
  `photoPathAuthor` VARCHAR(45) NULL,
  `usernameAuthor` VARCHAR(15) NOT NULL,
  `passwordAuthor` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`idAuthor`),
  UNIQUE INDEX `username_UNIQUE` (`usernameAuthor` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `blog_db`.`Tag`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `blog_db`.`Tag` (
  `idTag` INT NOT NULL AUTO_INCREMENT,
  `nameTag` VARCHAR(15) NOT NULL,
  PRIMARY KEY (`idTag`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `blog_db`.`Article_has_Tag`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `blog_db`.`Article_has_Tag` (
  `Article_idArticle` INT NOT NULL,
  `Tag_idTag` INT NOT NULL,
  PRIMARY KEY (`Article_idArticle`, `Tag_idTag`),
  INDEX `fk_Article_has_Tag_Tag1_idx` (`Tag_idTag` ASC) VISIBLE,
  INDEX `fk_Article_has_Tag_Article_idx` (`Article_idArticle` ASC) VISIBLE,
  CONSTRAINT `fk_Article_has_Tag_Article`
    FOREIGN KEY (`Article_idArticle`)
    REFERENCES `blog_db`.`Article` (`idArticle`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Article_has_Tag_Tag1`
    FOREIGN KEY (`Tag_idTag`)
    REFERENCES `blog_db`.`Tag` (`idTag`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `blog_db`.`Article_has_Author`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `blog_db`.`Article_has_Author` (
  `Article_idArticle` INT NOT NULL,
  `Author_idAuthor` INT NOT NULL,
  PRIMARY KEY (`Article_idArticle`, `Author_idAuthor`),
  INDEX `fk_Article_has_Author_Author1_idx` (`Author_idAuthor` ASC) VISIBLE,
  INDEX `fk_Article_has_Author_Article1_idx` (`Article_idArticle` ASC) VISIBLE,
  CONSTRAINT `fk_Article_has_Author_Article1`
    FOREIGN KEY (`Article_idArticle`)
    REFERENCES `blog_db`.`Article` (`idArticle`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Article_has_Author_Author1`
    FOREIGN KEY (`Author_idAuthor`)
    REFERENCES `blog_db`.`Author` (`idAuthor`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

