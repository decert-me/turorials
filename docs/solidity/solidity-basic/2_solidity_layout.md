# 合约代码组成

本节我们来分析下合约代码，看看一个合约代码由哪些部分组成，为后面编写代码打下基础。


 通常一个合约sol文件之后会包含以下几个部分：

（0）声明文件的 License；

（1）声明编译合约使用的编译器版本；

（2）用 import 引入其他合约文件

（3）用contract定义一个合约/用library定义一个库/用 interface 定义接口。

（4）定义合约内的状态变量、函数、事件、自定义类型等。





先回顾一下代码：
<SolidityEditor>
{`
//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
 
contract Counter {
    uint counter;
    
    constructor() {
        counter = 0;
    }
    
    function count() public {
        counter = counter + 1;
    }
    
    function get() public view returns (uint) {
        return counter;
    }
}
`}
</SolidityEditor>

  

## License 许可声明

```
// SPDX-License-Identifier: MIT
```



因为合约代码通常都是开源的，进行许可声明以表明其他人可以如何使用这份代码。



##  编译器版本声明

```
pragma solidity ^0.8.0;
```

关键字 *pragma* 的含义是：用来告诉编译器如何编译这段代码，^表示能高于0.8.0， 但是必须低于0.9.0，即只有第三位的版本号可以变。类似的还可以使用如：

```
pragma solidity >=0.8.0 <0.9.0;
```

Solidity中编译器的版本的声明，表达式遵循npm版本语义，可以参考https://docs.npmjs.com/misc/semver。

## 定义合约

```
contract Counter {
}
```

这句定义了一个合约，合约的名字为 `Counter`（和其他语言定义的“类”很相似）， 一个合约通常又是由**状态变量（合约数据）**和**合约函数**组成

## 状态变量

```
uint counter;
```

这行代码声明了一个变量，变量名为counter，类型为uint（一个256位的无符号整数），它就像数据库里面的一个存储单元。在以太坊中，所有的变量构成了整个区块链网络的状态，所以也称为状态变量。

Solidity是一个静态类型语言，每个变量需要在声明时确定类型。



## 合约函数

```
constructor()  {
    counter = 0;
}

function count() public {
    counter = counter + 1;
}


function get() public view returns (uint) {
    return counter;
}
```

这里定义了3个函数：第一个是构造函数，用来完成合约的初始化，在合约创建时执行； `count()` 是一个普通的函数，它对`counter`变量加1，任何修改状态变量都需要通过一个交易提交到链上，矿工打包之后交易才算完成；get()函数用来读取变量的值，这是一个视图函数，不需要提交交易。



`Counter` 非常简单，没有使用 `import` 引入其他文件，也没有定义事件和其他自定义类型，这些内容我们将在后面的文章里进一步介绍。



