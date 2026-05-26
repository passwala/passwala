const regex = /^(pay_[a-zA-Z0-9]+|pay_mock_[a-zA-Z0-9]+|mock_[a-zA-Z0-9]+)$/;
console.log(regex.test("pay_mock_sandbox_abc123"));
